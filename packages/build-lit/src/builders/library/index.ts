import {
	type BuilderOutput,
	createBuilder,
	resolveProjectPath,
	resolveWorkspacePath,
	BuildFailureError,
	relativeWorkspacePath,
	copyAssets,
	runPackager,
} from "@snuggery/architect";
import {isJsonObject, type JsonObject} from "@snuggery/core";
import {readFile, rm, writeFile} from "node:fs/promises";
import path, {posix} from "node:path";

import {build, isBuildFailure} from "../../esbuild.js";
import {forwardEsbuildOptions} from "../../helpers/esbuild-options.js";
import {extractLibraryEntryPoints} from "../../helpers/library-entry-points.js";
import {assetPlugin} from "../../plugins/asset.js";
import {externalPlugin} from "../../plugins/external.js";
import {sassPlugin} from "../../plugins/sass.js";
import {
	type TransformerFactoryFactory,
	typescriptPluginFactory,
	findTsConfig,
} from "../../plugins/typescript.js";
import {createDecoratorTransformerFactory} from "../../plugins/typescript/decorators.js";

import type {Schema} from "./schema.js";

const emoji = ["✨", "🚢", "🎉", "💯", "✅", "🏁", "🌈", "🦄"];

export default createBuilder<Schema>(
	async (input, context): Promise<BuilderOutput> => {
		const outdir =
			resolveWorkspacePath(context, input.outdir) ??
			(await resolveProjectPath(context, "dist"));

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

		const plugins = [assetPlugin(), sassPlugin()];
		if (!input.bundleDependencies) {
			plugins.push(externalPlugin());
		}

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
			(await resolveProjectPath(context, "package.json"));
		const manifestFolder = path.dirname(manifestPath);

		let manifest: JsonObject;
		try {
			manifest = JSON.parse(await readFile(manifestPath, "utf-8"));
		} catch (e) {
			throw new BuildFailureError(
				`Failed to read ${relativeWorkspacePath(context, manifestPath)}: ${
					e instanceof Error ? e.message : e
				}`,
			);
		}

		context.logger.info(`Building ${manifest.name}...`);

		const entryPoints = await extractLibraryEntryPoints(manifestPath, manifest);

		let compilerOptions: import("typescript").CompilerOptions | undefined;

		if (tsconfig) {
			context.logger.debug("Running typescript...");
			const {tsc} = await import("@snuggery/build-node");
			const {project} = await tsc(context, {
				compile: true,
				tsconfig: relativeWorkspacePath(context, tsconfig),
				outputFolder: outdir,
				validateConfiguration(compilerOptions) {
					if (!compilerOptions.declaration) {
						throw new BuildFailureError(
							`Expected "declaration": true in ${relativeWorkspacePath(
								context,
								tsconfig,
							)}`,
						);
					}

					if (
						compilerOptions.declarationDir &&
						compilerOptions.declarationDir !== outdir
					) {
						throw new BuildFailureError(
							`Expected declarationDir to be ${outdir} but found ${
								compilerOptions.declarationDir
							} in ${relativeWorkspacePath(context, tsconfig)}`,
						);
					}

					if (!compilerOptions.emitDeclarationOnly) {
						throw new BuildFailureError(
							`Expected "emitDeclarationOnly": true in ${relativeWorkspacePath(
								context,
								tsconfig,
							)}`,
						);
					}
				},
			});

			compilerOptions = project.options;
		}

		for (const optimize of [false, true]) {
			context.logger.debug(
				`Building ${optimize ? "optimized" : "development"} output...`,
			);
			try {
				const result = await build({
					absWorkingDir: context.workspaceRoot,

					entryPoints: entryPoints.map(({inputFilename, outputBasename}) => ({
						in: path.join(manifestFolder, inputFilename),
						out: optimize ? `${outputBasename}.min` : outputBasename,
					})),
					format: "esm",

					bundle: true,
					splitting: true,
					metafile: input.metafile,

					plugins,

					outdir,

					...forwardEsbuildOptions({
						...input,
						minify: optimize,
						tsconfig: tsconfig ?? undefined,
					}),

					// Unlike for applications, library entries shouldn't be cache-busted
					entryNames: "[dir]/[name]",
				});

				if (input.metafile) {
					await writeFile(
						path.join(outdir, "meta.json"),
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

		const handledKeys = new Set<string>();
		for (const {exportKey, exportValue, outputBasename} of entryPoints) {
			if (handledKeys.has(exportKey)) {
				continue;
			}
			handledKeys.add(exportKey);

			const exports =
				isJsonObject(allExports[exportKey]) ?
					{...(allExports[exportKey] as JsonObject)}
				:	{};

			delete exports.default;
			delete exports.snuggery;
			delete exports.import;
			delete exports.require;
			delete exports.node;
			delete exports.browser;
			delete exports.types;

			let basenameToUse = outputBasename;
			if (exportKey.includes("*")) {
				basenameToUse =
					exportKey.endsWith(".js") ?
						exportKey.slice(0, -".js".length)
					:	exportKey;
			}

			allExports[exportKey] = {
				...(compilerOptions ?
					{
						types: `./${(compilerOptions.declarationDir ?
							posix.join(
								posix.relative(outdir!, compilerOptions.declarationDir),
								posix.relative(
									compilerOptions.rootDir ?? manifestFolder,
									posix.resolve(manifestFolder, exportValue),
								),
							)
						:	posix.relative(
								compilerOptions.rootDir ?? manifestFolder,
								posix.resolve(manifestFolder, exportValue),
							)
						).replace(/\.([cm]?ts)$/, ".d.$1")}`,
					}
				:	{}),

				...exports,

				import: {
					production: `${basenameToUse}.min.js`,
					default: `${basenameToUse}.js`,
				},
				default: `${basenameToUse}.js`,
			};
		}

		await writeFile(
			path.join(outdir, "package.json"),
			JSON.stringify(manifest, null, 2) + "\n",
		);

		if (input.assets?.length) {
			context.logger.debug("Copying assets...");
			await copyAssets(context, outdir, input.assets);
		}

		if (input.package ?? input.packager) {
			await runPackager(context, {packager: input.packager, directory: outdir});
		}

		context.logger.info(
			`Done! ${emoji[Math.floor(Math.random() * emoji.length)]}`,
		);

		return {success: true};
	},
);
