import type {Locale} from '@lit/localize-tools/lib/types/locale.js';
import {resolveProjectPath, resolveWorkspacePath} from '@snuggery/architect';
import {BuilderOutput, createBuilder} from '@snuggery/architect/create-builder';
import type {Plugin} from 'esbuild';
import {rm, writeFile} from 'node:fs/promises';
import path, {posix} from 'node:path';

import {build, isBuildFailure} from '../../esbuild.js';
import {extractEntryPoints} from '../../helpers/entry-points.js';
import {forwardEsbuildOptions} from '../../helpers/esbuild-options.js';
import {readLocalizeToolsConfig} from '../../helpers/i18n-config.js';
import {assetPlugin} from '../../plugins/asset.js';
import {localizePluginFactory} from '../../plugins/localize.js';
import {sassPlugin} from '../../plugins/sass.js';

import type {Schema} from './schema.js';

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
			extraPlugins: Plugin[];
			baseHref: string | undefined;
			outdir: string;
			locale?: string;
		}[];
		if (input.localize == null) {
			if (input.baseHref != null && typeof input.baseHref !== 'string') {
				return {
					success: false,
					error:
						'The baseHref cannot be passed as object if no locales are passed via localize',
				};
			}
			configurations = [{extraPlugins: [], baseHref: input.baseHref, outdir}];
		} else {
			const localizeConfiguration = await readLocalizeToolsConfig(
				context,
				input,
			);

			const plugins = await localizePluginFactory(
				context,
				localizeConfiguration,
			);

			if (typeof input.localize === 'string') {
				const plugin = plugins.get(input.localize as Locale);
				if (plugin == null) {
					return {
						success: false,
						error: `Locale '${input.localize}' is not configured in i18n`,
					};
				}

				configurations = [
					{
						extraPlugins: [plugin],
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
					const plugin = plugins.get(locale as Locale);
					if (plugin == null) {
						return {
							success: false,
							error: `Locale '${locale}' is not configured in i18n`,
						};
					}

					configurations.push(
						input.baseHref != null
							? {
									extraPlugins: [plugin],
									locale,
									outdir,
									baseHref:
										typeof input.baseHref === 'string'
											? posix.join(input.baseHref, locale)
											: input.baseHref?.[locale],
							  }
							: {
									extraPlugins: [plugin],
									locale,
									outdir: path.join(outdir, locale),
									baseHref: undefined,
							  },
					);
				}
			}
		}

		for (const {extraPlugins, ...c} of configurations) {
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

					plugins: [assetPlugin(), sassPlugin(), ...extraPlugins],

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
