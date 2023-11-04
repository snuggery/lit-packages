/* cspell:ignore tffs */

import {
	type BuilderOutput,
	createBuilder,
	resolveProjectPath,
	resolveWorkspacePath,
} from '@snuggery/architect';
import {rm, writeFile} from 'node:fs/promises';
import path, {posix} from 'node:path';

import {build, isBuildFailure} from '../../esbuild.js';
import {extractEntryPoints} from '../../helpers/entry-points.js';
import {forwardEsbuildOptions} from '../../helpers/esbuild-options.js';
import {readLocalizeToolsConfig} from '../../helpers/i18n-config.js';
import {assetPlugin} from '../../plugins/asset.js';
import {sassPlugin} from '../../plugins/sass.js';
import {
	type TransformerFactoryFactory,
	typescriptPluginFactory,
} from '../../plugins/typescript.js';
import {createDecoratorTransformerFactory} from '../../plugins/typescript/decorators.js';
import {createLocalizeTransformerFactories} from '../../plugins/typescript/localize.js';

import type {Schema} from './schema.js';

import type {Locale} from '#@lit/localize-tools/lib/types/locale.js';

export default createBuilder<Schema>(
	async (input, context): Promise<BuilderOutput> => {
		const outdir =
			resolveWorkspacePath(context, input.outdir) ??
			(await resolveProjectPath(context, 'dist'));

		await rm(outdir, {
			recursive: true,
			force: true,
		});

		let configurations: {
			transformerFactoryFactories: TransformerFactoryFactory[];
			inputFiles?: string[];
			tsConfig?: string;
			baseHref: string | undefined;
			outdir: string;
			locale?: string;
		}[];

		const globalTransformerFactoryFactories: TransformerFactoryFactory[] = [];

		if (input.inlineLitDecorators) {
			globalTransformerFactoryFactories.push(
				await createDecoratorTransformerFactory(input),
			);
		}

		if (input.localize == null) {
			if (input.baseHref != null && typeof input.baseHref !== 'string') {
				return {
					success: false,
					error:
						'The baseHref cannot be passed as object if no locales are passed via localize',
				};
			}
			configurations = [
				{
					transformerFactoryFactories: [...globalTransformerFactoryFactories],
					baseHref: input.baseHref,
					outdir,
				},
			];
		} else {
			const localizeConfiguration = await readLocalizeToolsConfig(
				context,
				input,
			);

			const localizeTffs = await createLocalizeTransformerFactories(
				localizeConfiguration,
			);

			if (typeof input.localize === 'string') {
				const localizeTff = localizeTffs.get(input.localize as Locale);
				if (localizeTff == null) {
					return {
						success: false,
						error: `Locale '${input.localize}' is not configured in i18n`,
					};
				}

				configurations = [
					{
						transformerFactoryFactories: [
							...globalTransformerFactoryFactories,
							localizeTff,
						],
						outdir,
						baseHref:
							typeof input.baseHref === 'string'
								? input.baseHref
								: input.baseHref?.[input.localize],
						locale: input.localize,
					},
				];
			} else {
				configurations = [];
				for (const locale of Array.isArray(input.localize)
					? input.localize
					: [input.localize]) {
					const localizeTff = localizeTffs.get(locale as Locale);
					if (localizeTff == null) {
						return {
							success: false,
							error: `Locale '${locale}' is not configured in i18n`,
						};
					}

					configurations.push(
						input.baseHref != null
							? {
									transformerFactoryFactories: [
										...globalTransformerFactoryFactories,
										localizeTff,
									],
									locale,
									outdir,
									baseHref:
										typeof input.baseHref === 'string'
											? posix.join(input.baseHref, locale)
											: input.baseHref?.[locale],
							  }
							: {
									transformerFactoryFactories: [
										...globalTransformerFactoryFactories,
										localizeTff,
									],
									locale,
									outdir: path.join(outdir, locale),
									baseHref: undefined,
							  },
					);
				}
			}
		}

		for (const {transformerFactoryFactories, ...c} of configurations) {
			const plugins = [assetPlugin(), sassPlugin()];

			if (transformerFactoryFactories.length > 0) {
				plugins.push(
					await typescriptPluginFactory(
						context,
						{tsConfig: input.tsconfig!},
						transformerFactoryFactories,
					),
				);
			}

			const {entryPoints, outdir, processResult} = await extractEntryPoints(
				context,
				{
					...input,
					...c,
				},
			);

			try {
				const result = await build({
					absWorkingDir: context.workspaceRoot,

					entryPoints,
					format: 'esm',

					bundle: true,
					metafile: true,

					plugins,

					outdir,
					outbase: input.outbase,

					...forwardEsbuildOptions(input),
				});

				await processResult(result);

				if (input.metafile) {
					await writeFile(
						path.join(outdir, 'meta.json'),
						JSON.stringify(result.metafile),
					);
				}
			} catch (e) {
				if (isBuildFailure(e)) {
					return {success: false};
				}

				throw e;
			}
		}

		return {success: true};
	},
);
