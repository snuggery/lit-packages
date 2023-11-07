import {
	type BuilderOutput,
	createBuilder,
	resolveProjectPath,
	resolveWorkspacePath,
	BuildFailureError,
	relativeWorkspacePath,
	copyAssets,
} from '@snuggery/architect';
import {isJsonObject, type JsonObject} from '@snuggery/core';
import {readFile, rm, writeFile} from 'node:fs/promises';
import path from 'node:path';

import {build, isBuildFailure} from '../../esbuild.js';
import {forwardEsbuildOptions} from '../../helpers/esbuild-options.js';
import {extractLibraryEntryPoints} from '../../helpers/library-entry-points.js';
import {assetPlugin} from '../../plugins/asset.js';
import {externalPlugin} from '../../plugins/external.js';
import {sassPlugin} from '../../plugins/sass.js';
import {
	type TransformerFactoryFactory,
	typescriptPluginFactory,
	findTsConfig,
} from '../../plugins/typescript.js';
import {createDecoratorTransformerFactory} from '../../plugins/typescript/decorators.js';

import type {Schema} from './schema.js';

export default createBuilder<Schema>(
	async (input, context): Promise<BuilderOutput> => {
		const outdir =
			resolveWorkspacePath(context, input.outdir) ??
			(await resolveProjectPath(context, 'dist'));

		if (input.clean) {
			await rm(outdir, {
				recursive: true,
				force: true,
			});
		}

		const tsconfig = await findTsConfig(context, input.tsconfig);

		const transformerFactoryFactories: TransformerFactoryFactory[] = [];

		if (input.inlineLitDecorators) {
			transformerFactoryFactories.push(
				await createDecoratorTransformerFactory({tsconfig: tsconfig}),
			);
		}

		const plugins = [externalPlugin(), assetPlugin(), sassPlugin()];

		if (transformerFactoryFactories.length > 0) {
			plugins.push(
				await typescriptPluginFactory(
					context,
					{tsConfig: tsconfig!},
					transformerFactoryFactories,
				),
			);
		}

		const manifestPath =
			resolveWorkspacePath(context, input.manifest) ??
			(await resolveProjectPath(context, 'package.json'));
		const manifestFolder = path.dirname(manifestPath);

		let manifest: JsonObject;
		try {
			manifest = JSON.parse(await readFile(manifestPath, 'utf-8'));
		} catch (e) {
			throw new BuildFailureError(
				`Failed to read ${relativeWorkspacePath(context, manifestPath)}: ${
					e instanceof Error ? e.message : e
				}`,
			);
		}

		const entryPoints = extractLibraryEntryPoints(manifest);

		if (tsconfig) {
			const {tsc} = await import('@snuggery/node');
			await tsc(
				context,
				{
					compile: true,
					tsconfig: relativeWorkspacePath(context, tsconfig),
				},
				outdir,
			);
		}

		for (const optimize of [false, true]) {
			try {
				const result = await build({
					absWorkingDir: context.workspaceRoot,

					entryPoints: entryPoints.map(({inputFilename, outputBasename}) => ({
						in: path.join(manifestFolder, inputFilename),
						out: optimize ? `${outputBasename}.min` : outputBasename,
					})),
					format: 'esm',

					bundle: true,
					metafile: input.metafile,

					plugins,

					outdir,

					...forwardEsbuildOptions({...input, tsconfig: tsconfig ?? undefined}),

					...(optimize
						? {
								minify: true,
								define: {
									SNUGGERY_DEV_MODE: 'false',
								},
						  }
						: {}),
				});

				if (input.metafile) {
					await writeFile(
						path.join(outdir, 'meta.json'),
						JSON.stringify(result.metafile),
					);
				}
				result.outputFiles;
			} catch (e) {
				if (isBuildFailure(e)) {
					return {success: false};
				}

				throw e;
			}
		}

		delete manifest.devDependencies;
		delete manifest.scripts;
		delete manifest.private;
		const allExports = manifest.exports as JsonObject;

		for (const {exportKey, outputBasename} of entryPoints) {
			const exports = isJsonObject(allExports[exportKey])
				? {...(allExports[exportKey] as JsonObject)}
				: {};

			delete exports.default;
			delete exports.snuggery;
			delete exports.import;
			delete exports.types;

			allExports[exportKey] = {
				...(tsconfig
					? {
							types: `${outputBasename}.d.ts`,
					  }
					: {}),
				import: {
					production: `${outputBasename}.min.js`,
					default: `${outputBasename}.js`,
				},

				...exports,

				default: `${outputBasename}.js`,
			};
		}

		await writeFile(
			path.join(outdir, 'package.json'),
			JSON.stringify(manifest, null, 2) + '\n',
		);

		if (input.assets?.length) {
			await copyAssets(context, outdir, input.assets);
		}

		return {success: true};
	},
);
