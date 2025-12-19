/* cspell:word servedir */
/* cspell:ignore tffs */

import {
	type BuilderOutput,
	createBuilder,
	resolveTargetString,
	targetFromTargetString,
	BuildFailureError,
} from "@snuggery/architect";
import type {JsonObject} from "@snuggery/core";
import {mkdtemp, rm} from "fs/promises";
import path, {posix} from "node:path";
import os from "os";

import {
	context as createEsbuildContext,
	isBuildFailure,
} from "../../esbuild.js";
import {extractApplicationEntryPoints} from "../../helpers/application-entry-points.js";
import {forwardEsbuildOptions} from "../../helpers/esbuild-options.js";
import {readLocalizeToolsConfig} from "../../helpers/i18n-config.js";
import {assetPlugin} from "../../plugins/asset.js";
import {createCssResourcePlugin} from "../../plugins/css-resources.js";
import {sassPlugin} from "../../plugins/sass.js";
import {
	typescriptPluginFactory,
	type TransformerFactoryFactory,
} from "../../plugins/typescript.js";
import {createDecoratorTransformerFactory} from "../../plugins/typescript/decorators.js";
import {createLocalizeTransformerFactories} from "../../plugins/typescript/localize.js";
import type {Schema as ApplicationSchema} from "../application/schema.js";

import type {Schema} from "./schema.js";

import type {Locale} from "#@lit/localize-tools/lib/types/locale.js";

export default createBuilder<Schema>(
	async function* (input, context): AsyncIterable<BuilderOutput> {
		const tmpdir = await mkdtemp(path.join(os.tmpdir(), "lit-dev-server"));
		context.addTeardown(() => rm(tmpdir, {force: true, recursive: true}));

		const watch = input.watch !== false;
		const liveReload = input.liveReload !== false;

		const applicationInput = await context.validateOptions<
			JsonObject & ApplicationSchema
		>(
			await context.getTargetOptions(
				targetFromTargetString(
					resolveTargetString(context, input.applicationTarget ?? "build"),
				),
			),
			"@snuggery/build-lit:application",
		);

		let baseHref;
		if (applicationInput.baseHref == null) {
			baseHref = undefined;
		} else if (typeof applicationInput.baseHref === "string") {
			baseHref =
				input.localize && Array.isArray(applicationInput.localize) ?
					posix.join(applicationInput.baseHref, input.localize)
				:	applicationInput.baseHref;
		} else {
			if (!input.localize) {
				throw new BuildFailureError(
					"The baseHref cannot be passed as object if no locale is passed via localize",
				);
			}
			baseHref = applicationInput.baseHref[input.localize];
		}

		const transformerFactoryFactories: TransformerFactoryFactory[] = [];

		if (applicationInput.inlineLitDecorators) {
			transformerFactoryFactories.push(
				await createDecoratorTransformerFactory(applicationInput),
			);
		}

		if (input.localize) {
			const localizeConfiguration = await readLocalizeToolsConfig(
				context,
				applicationInput,
			);

			const localizeTffs = await createLocalizeTransformerFactories(
				localizeConfiguration,
			);

			const localizeTff = localizeTffs.get(input.localize as Locale);
			if (localizeTff == null) {
				throw new BuildFailureError(
					`Locale '${input.localize}' is not configured in i18n`,
				);
			}

			transformerFactoryFactories.push(localizeTff);
		}

		const {entryPoints, fallback, outdir, processResult} =
			await extractApplicationEntryPoints(context, {
				...applicationInput,
				outdir: tmpdir,
				baseHref,
				liveReload,
				watch,
			});

		const plugins = [assetPlugin(), createCssResourcePlugin(), sassPlugin()];

		if (transformerFactoryFactories.length > 0) {
			plugins.push(
				await typescriptPluginFactory(
					context,
					{tsConfig: applicationInput.tsconfig!},
					transformerFactoryFactories,
				),
			);
		}

		try {
			const esbuildContext = await createEsbuildContext({
				absWorkingDir: context.workspaceRoot,

				entryPoints,
				format: "esm",

				bundle: true,
				metafile: true,

				plugins,

				outdir,
				outbase: applicationInput.outbase,

				...forwardEsbuildOptions(applicationInput),
			});

			await processResult(await esbuildContext.rebuild());

			context.addTeardown(() => esbuildContext.dispose());

			if (watch) {
				if (applicationInput.minify) {
					context.logger.warn(
						"Watching is not supported when minification is enabled",
					);
				} else {
					await esbuildContext.watch();
				}
			}

			const {hosts, port} = await esbuildContext.serve({
				host: input.host ?? "localhost",
				port: input.port,
				servedir: tmpdir,
				fallback,
			});

			const host = hosts[0] ?? "0.0.0.0";
			let hostedUrl = `http://${host}:${port}`;
			if (baseHref) {
				hostedUrl = `${hostedUrl}${
					baseHref.startsWith("/") ? baseHref : `/${baseHref}`
				}`;
			}

			context.logger.info(`Serving on ${hostedUrl}`);
			yield {
				success: true,
				port,
				host,
				baseUrl: hostedUrl,
			};

			context.addTeardown(() => esbuildContext.dispose());

			return await new Promise<void>((resolve) => {
				context.addTeardown(resolve);
			});
		} catch (e) {
			if (isBuildFailure(e)) {
				yield {success: false};
				return;
			}

			throw e;
		}
	},
);
