import {resolveWorkspacePath} from '@snuggery/architect';
import {BuilderOutput, createBuilder} from '@snuggery/architect/create-builder';
import type {BuildOptions} from 'esbuild';
import type karma from 'karma';
import {createRequire} from 'node:module';
import path from 'node:path';

import {forwardEsbuildOptions} from '../../helpers/esbuild-options.js';
import {Deferred} from '../../helpers/promise.js';
import {getFiles} from '../../helpers/typescript.js';
import {assetPlugin} from '../../plugins/asset.js';
import {sassPlugin} from '../../plugins/sass.js';

import type {Schema} from './schema.js';

export default createBuilder<Schema>(
	async (input, context): Promise<BuilderOutput> => {
		const require = createRequire(import.meta.url);

		let karma;
		try {
			karma = await import('karma').then(m => m.default);
		} catch {
			return {
				success: false,
				error: 'Please install karma to run @ngx-lit/build-lit:karma',
			};
		}

		const config: karma.Config & karma.ConfigOptions =
			await karma.config.parseConfig(
				resolveWorkspacePath(context, input.karmaConfig),
				{
					esbuild: {
						absWorkingDir: context.workspaceRoot,

						bundle: true,

						plugins: [assetPlugin(), sassPlugin()],

						format: 'esm',

						...forwardEsbuildOptions(input),

						singleBundle: false,
					},

					autoWatch: !!input.watch,
					singleRun: !input.watch,
				} as karma.ConfigOptions & {esbuild: BuildOptions},
				{promiseConfig: true, throwErrors: true},
			);

		(config.files ??= []).push(
			...(await getFiles(context, input)).map(pattern => ({
				pattern,
				type: 'module' as const,
			})),
		);

		(config.plugins ??= []).push(require.resolve('#karma-esbuild'), {
			'preprocessor:esbuild-source': ['factory', createPreprocessor],
		});

		type Preprocessor = (
			content: string,
			file: {originalPath: string},
			next: (error: unknown, content?: string) => void,
		) => unknown;
		createPreprocessor.$inject = ['preprocessor:esbuild'];
		function createPreprocessor(
			esbuildPreprocessor: Preprocessor,
		): Preprocessor {
			const node_modules = `${path.sep}node_modules${path.sep}`;
			return (content, file, next) => {
				if (file.originalPath.includes(node_modules)) {
					next(null, content);
				} else {
					esbuildPreprocessor(content, file, next);
				}
			};
		}

		config.preprocessors = {
			...config.preprocessors,
			'**/*.{js,ts,jsx,tsx,mjs,mts,cjs,cts}': ['esbuild-source'],
		};

		const deferred = new Deferred<BuilderOutput>();

		try {
			const server = new karma.Server(config, exitCode => {
				deferred.resolve({success: exitCode === 0});
			});

			await server.start();

			context.addTeardown(() => server.stop());
		} catch (e) {
			deferred.reject(e);
		}

		return await deferred;
	},
);
