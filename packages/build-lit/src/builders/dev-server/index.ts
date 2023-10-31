/* cspell:word servedir */

import {
	type BuilderOutput,
	createBuilder,
	resolveTargetString,
	targetFromTargetString,
} from '@snuggery/architect';
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
import type {Schema as ApplicationSchema} from '../application/schema.js';

import type {Schema} from './schema.js';

import type {Locale} from '#@lit/localize-tools/lib/types/locale.js';

export default createBuilder<Schema>(async function* (
	input,
	context,
): AsyncIterable<BuilderOutput> {
	const tmpdir = await mkdtemp(path.join(os.tmpdir(), 'lit-dev-server'));
	context.addTeardown(() => rm(tmpdir, {force: true, recursive: true}));

	const watch = input.watch !== false;
	const liveReload = input.liveReload !== false;

	const applicationInput = await context.validateOptions<
		JsonObject & ApplicationSchema
	>(
		await context.getTargetOptions(
			targetFromTargetString(
				resolveTargetString(context, input.applicationTarget ?? 'build'),
			),
		),
		'@snuggery/build-lit:application',
	);

	let baseHref;
	if (applicationInput.baseHref == null) {
		baseHref = undefined;
	} else if (typeof applicationInput.baseHref === 'string') {
		baseHref =
			input.localize && Array.isArray(applicationInput.localize)
				? posix.join(applicationInput.baseHref, input.localize)
				: applicationInput.baseHref;
	} else {
		if (!input.localize) {
			yield {
				success: false,
				error:
					'The baseHref cannot be passed as object if no locale is passed via localize',
			};
			return;
		}
		baseHref = applicationInput.baseHref[input.localize];
	}

	const extraPlugins: Plugin[] = [];
	if (input.localize) {
		const localizeConfiguration = await readLocalizeToolsConfig(
			context,
			applicationInput,
		);

		const plugins = await localizePluginFactory(context, localizeConfiguration);

		const plugin = plugins.get(input.localize as Locale);
		if (plugin == null) {
			yield {
				success: false,
				error: `Locale '${input.localize}' is not configured in i18n`,
			};
			return;
		}

		extraPlugins.push(plugin);
	}

	const {entryPoints, outdir, processResult} = await extractEntryPoints(
		context,
		{
			...applicationInput,
			outdir: tmpdir,
			baseHref,
			liveReload,
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
			outbase: applicationInput.outbase,

			...forwardEsbuildOptions(applicationInput),
		});

		await processResult(await esbuildContext.rebuild());

		context.addTeardown(() => esbuildContext.dispose());

		if (watch) {
			if (applicationInput.minify) {
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

		let hostedUrl = `http://${host}:${port}`;
		if (baseHref) {
			hostedUrl = `${hostedUrl}${
				baseHref.startsWith('/') ? baseHref : `/${baseHref}`
			}`;
		}

		context.logger.info(`Serving on ${hostedUrl}`);
		yield {
			success: true,
			port,
			host,
			baseUrl: hostedUrl,
		};

		return await new Promise<never>(() => {
			// never resolve or reject
		});
	} catch (e) {
		if (isBuildFailure(e)) {
			yield {success: false};
			return;
		}

		throw e;
	}
});
