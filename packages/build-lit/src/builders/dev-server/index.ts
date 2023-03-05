/* cspell:word servedir */

import {resolveTargetString, targetFromTargetString} from '@snuggery/architect';
import {BuilderOutput, createBuilder} from '@snuggery/architect/create-builder';
import type {JsonObject} from '@snuggery/core';
import type {Plugin} from 'esbuild';
import {mkdtemp, rm} from 'fs/promises';
import path, {posix} from 'node:path';
import os from 'os';

import {
	context as createEsbuildContext,
	isBuildFailure,
} from '../../esbuild.js';
import {extractEntryPoints} from '../../helpers/entry-points.js';
import {forwardEsbuildOptions} from '../../helpers/esbuild-options.js';
import {readLocalizeToolsConfig} from '../../helpers/i18n-config.js';
import {assetPlugin} from '../../plugins/asset.js';
import {localizePluginFactory} from '../../plugins/localize.js';
import {sassPlugin} from '../../plugins/sass.js';
import type {Schema as BrowserSchema} from '../browser/schema.js';

import type {Schema} from './schema.js';

import type {Locale} from '#@lit/localize-tools/lib/types/locale.js';

export default createBuilder<Schema>(
	async (input, context): Promise<BuilderOutput> => {
		const tmpdir = await mkdtemp(path.join(os.tmpdir(), 'ngx-lit-dev-server'));
		context.addTeardown(() => rm(tmpdir, {force: true, recursive: true}));

		const watch = input.watch !== false;

		const browserInput = await context.validateOptions<
			JsonObject & BrowserSchema
		>(
			await context.getTargetOptions(
				targetFromTargetString(
					resolveTargetString(context, input.browserTarget),
				),
			),
			'@ngx-lit/build-lit:browser',
		);

		let baseHref;
		if (browserInput.baseHref == null) {
			baseHref = undefined;
		} else if (typeof browserInput.baseHref === 'string') {
			baseHref =
				input.localize && Array.isArray(browserInput.localize)
					? posix.join(browserInput.baseHref, input.localize)
					: browserInput.baseHref;
		} else {
			if (!input.localize) {
				return {
					success: false,
					error:
						'The baseHref cannot be passed as object if no locale is passed via localize',
				};
			}
			baseHref = browserInput.baseHref[input.localize];
		}

		const extraPlugins: Plugin[] = [];
		if (input.localize) {
			const localizeConfiguration = await readLocalizeToolsConfig(
				context,
				browserInput,
			);

			const plugins = await localizePluginFactory(
				context,
				localizeConfiguration,
			);

			const plugin = plugins.get(input.localize as Locale);
			if (plugin == null) {
				return {
					success: false,
					error: `Locale '${input.localize}' is not configured in i18n`,
				};
			}

			extraPlugins.push(plugin);
		}

		const {entryPoints, outdir, processResult} = await extractEntryPoints(
			context,
			{
				...browserInput,
				outdir: tmpdir,
				baseHref,
				watch,
			},
		);

		try {
			const esbuildContext = await createEsbuildContext({
				absWorkingDir: context.workspaceRoot,

				entryPoints,
				format: 'esm',

				bundle: true,
				metafile: true,

				plugins: [assetPlugin(), sassPlugin(), ...extraPlugins],

				outdir,
				outbase: browserInput.outbase,

				...forwardEsbuildOptions(browserInput),
			});

			await processResult(await esbuildContext.rebuild());

			context.addTeardown(() => esbuildContext.dispose());

			if (watch) {
				if (browserInput.minify) {
					context.logger.warn(
						'Watching is not supported when minification is enabled',
					);
				} else {
					await esbuildContext.watch();
				}
			}

			const {host, port} = await esbuildContext.serve({
				host: input.host ?? 'localhost',
				port: input.port,
				servedir: tmpdir,
			});

			context.logger.info(`Serving on http://${host}:${port}`);

			return await new Promise<never>(() => {
				// never resolve or reject
			});
		} catch (e) {
			if (isBuildFailure(e)) {
				return {success: false};
			}

			throw e;
		}
	},
);
