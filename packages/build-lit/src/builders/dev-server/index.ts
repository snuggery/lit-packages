/* cspell:word servedir */

import {BuilderOutput, createBuilder} from '@angular-devkit/architect';
import type {Locale} from '@lit/localize-tools/lib/types/locale.js';
import {resolveTargetString, targetFromTargetString} from '@snuggery/architect';
import type {JsonObject} from '@snuggery/core';
import type {Plugin} from 'esbuild';
import {mkdtemp, rm} from 'fs/promises';
import {posix} from 'node:path';
import os from 'os';
import {join} from 'path';

import {
	context as createEsbuildContext,
	isBuildFailure,
} from '../../esbuild.js';
import {extractEntryPoints} from '../../helpers/entry-points.js';
import {readLocalizeToolsConfig} from '../../helpers/i18n-config.js';
import {assetPlugin} from '../../plugins/asset.js';
import {localizePluginFactory} from '../../plugins/localize.js';
import {sassPlugin} from '../../plugins/sass.js';
import type {Schema as BrowserSchema} from '../browser/schema.js';

import type {Schema} from './schema.js';

export default createBuilder<Schema>(
	async (input, context): Promise<BuilderOutput> => {
		const tmpdir = await mkdtemp(join(os.tmpdir(), 'ngx-lit-dev-server'));
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
			if ('error' in localizeConfiguration) {
				return {success: false, error: localizeConfiguration.error};
			}

			const plugins = await localizePluginFactory(
				context,
				localizeConfiguration,
			);
			if ('error' in plugins) {
				return {success: false, error: plugins.error};
			}

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
				entryPoints,

				absWorkingDir: context.workspaceRoot,

				bundle: true,
				metafile: true,

				plugins: [assetPlugin(), sassPlugin(), ...extraPlugins],

				format: 'esm',
				target: browserInput.target,

				outdir,
				outbase: browserInput.outdir,

				...(browserInput.minify
					? {
							minify: true,
							entryNames: '[dir]/[name]-[hash]',
							assetNames: '[dir]/[name]-[hash]',
							chunkNames: 'chunks/[name]-[hash]',
					  }
					: {
							minify: false,
							conditions: ['development'],
							entryNames: '[dir]/[name]',
							assetNames: '[dir]/[name]',
							chunkNames: 'chunks/[name]',
					  }),

				tsconfig: browserInput.tsconfig,
				banner: browserInput.banner,
				footer: browserInput.footer,
				inject: browserInput.inject,
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
