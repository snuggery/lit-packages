// cspell:ignore middlewares

import {
	type BuilderContext,
	resolveWorkspacePath,
	BuildFailureError,
	getProjectPath,
} from "@snuggery/architect";
import {lookup as lookupMimeType} from "mrmime";
import {createHash} from "node:crypto";
import type {ServerResponse} from "node:http";
import path, {posix} from "node:path";
import {platform} from "node:process";
import type {Connect, Plugin, UserConfig} from "vite";
import type {
	BrowserConfigOptions,
	CliOptions,
	UserWorkspaceConfig,
} from "vitest/node";

import {getBrowserConfig} from "./config/browser.js";
import {generateCoverageConfig} from "./config/coverage.js";
import type {Schema} from "./schema.js";

const isWindows = process.platform === "win32";

async function createVitestConfigPlugin({
	projectName,
	input,
	context,
	browser,
	files,
	plugins,
}: {
	projectName: string;
	input: Schema;
	context: BuilderContext;
	browser?: BrowserConfigOptions;
	files: string[];
	plugins: Plugin[];
}): Promise<Plugin> {
	const {mergeConfig} = await import("vitest/config");

	return {
		name: "@snuggery/build-lit:vitest-config",
		async config(config) {
			if (config.esbuild) {
				for (const prop of Object.keys(config.esbuild)) {
					switch (prop) {
						case "target":
						case "sourcemap":
						case "legalComments":
							break;
						default:
							context.logger.error(
								`Vitest config \`esbuild.${prop}\` is set but not supported by @snuggery/build-lit, the value will be ignored`,
							);
					}
				}
			}

			if (config.test?.include) {
				context.logger.error(
					"Vitest config `test.include` is not supported by @snuggery/build-lit, this property is managed via your workspace instead",
				);
				config.test.include = undefined;
			}

			if (config.test?.projects) {
				context.logger.error(
					"Vitest config `test.projects` is set but projects are not supported by @snuggery/build-lit, the value will be ignored",
				);
			}

			let project: UserWorkspaceConfig = {
				test: {
					environment: "jsdom",
					sequence: {setupFiles: "list"},
				},
			};

			if (config.test) {
				project = mergeConfig(project, {test: config.test});
			}

			const projectOverrides: UserWorkspaceConfig = {
				test: {
					name: projectName,
					include: files,
					...(input.setupFiles?.length ?
						{
							setupFiles: input.setupFiles.map((file) =>
								resolveWorkspacePath(context, file),
							),
						}
					:	{}),
					...(browser ? {browser} : {}),
				},
				plugins: [
					plugins,
					config.plugins?.filter(
						(plugin) =>
							!(plugin && "name" in plugin) ||
							!(
								plugin.name.startsWith("@snuggery/build-lit:") ||
								plugin.name.startsWith("vitest")
							),
					) ?? [],
				],
			};

			const coverage = await generateCoverageConfig(
				input,
				context,
				config.test?.coverage,
			);

			return {
				test: {
					coverage,
					...(input.filter ? {testNamePattern: input.filter} : {}),
					...(input.reporters?.length ? {reporters: input.reporters} : {}),
					projects: [mergeConfig(project, projectOverrides)],
				},
				esbuild: false,
			};
		},
	};
}

const toPosixPath: (path: string) => string =
	platform === "win32" ?
		(path) => path.replaceAll(/\\/g, posix.sep)
	:	(path) => path;

function createVirtualFilePlugin(
	{workspaceRoot}: BuilderContext,
	outputFileMap: ReadonlyMap<string, import("esbuild").OutputFile>,
	testToEntryPointMap: ReadonlyMap<string, string>,
): Plugin {
	let root: string;

	return {
		name: "@snuggery/build-lit:virtual-files",
		enforce: "pre",

		configResolved(config) {
			root = config.test?.root ?? config.root;
		},

		resolveId(id, importer) {
			// Workaround for Vitest in Windows when a fully qualified absolute path is provided with
			// a superfluous leading slash. This can currently occur with the `@vitest/coverage-v8` provider
			// when it uses `removeStartsWith(url, FILE_PROTOCOL)` to convert a file URL resulting in
			// `/D:/tmp_dir/...` instead of `D:/tmp_dir/...`.
			if (id[0] === "/" && isWindows) {
				const slicedId = id.slice(1);
				if (path.isAbsolute(slicedId)) {
					return slicedId;
				}
			}

			if (
				importer &&
				(id.startsWith("/") || id.startsWith("./") || id.startsWith("../"))
			) {
				const fullPath = posix.resolve(toPosixPath(path.dirname(importer)), id);
				const relativePath = posix.relative(root, fullPath);

				if (outputFileMap.has(relativePath)) {
					return fullPath;
				}
			}

			// Determine the base directory for resolution.
			let baseDir: string;
			if (importer) {
				// If the importer is a test entry point, resolve relative to the workspace root.
				// Otherwise, resolve relative to the importer's directory.
				baseDir =
					testToEntryPointMap.has(importer) ? workspaceRoot : (
						path.dirname(importer)
					);
			} else {
				// If there's no importer, assume the id is relative to the workspace root.
				baseDir = workspaceRoot;
			}

			// Construct the full, absolute path and normalize it to POSIX format.
			const fullPath = toPosixPath(path.join(baseDir, id));

			// Check if the resolved path corresponds to a known build artifact.
			const relativePath = path.relative(root, fullPath);
			if (outputFileMap.has(toPosixPath(relativePath))) {
				return fullPath;
			}

			// If the module cannot be resolved from the build artifacts, let other plugins handle it.
			return undefined;
		},
		async load(id) {
			// Attempt to load as a source test file.
			const entryPoint = testToEntryPointMap.get(id);
			if (entryPoint) {
				// To support coverage exclusion of the actual test file, the virtual
				// test entry point only references the built and bundled intermediate file.

				const absoluteEntryPoint = path.join(root, entryPoint + ".js");
				let relativePath = toPosixPath(
					path.relative(path.dirname(id), absoluteEntryPoint),
				);
				if (!relativePath.startsWith("../")) {
					relativePath = "./" + relativePath;
				}

				return {
					code: `import ${JSON.stringify(relativePath)};`,
				};
			}

			// Attempt to load as a built artifact.
			const relativePath = path.relative(root, id);
			const outputPath = toPosixPath(relativePath);

			const outputFile = outputFileMap.get(outputPath);
			if (!outputFile) {
				return;
			}

			const code = outputFile.text;
			const sourceMapPath = outputPath + ".map";
			const sourceMapFile = outputFileMap.get(sourceMapPath);
			const sourceMapText = sourceMapFile ? sourceMapFile.text : undefined;

			const map = sourceMapText ? JSON.parse(sourceMapText) : undefined;
			if (map?.sources?.length) {
				map.sources = map.sources.map((source: string) => `/` + source);
			}

			return {
				code,
				map,
			};
		},
		configureServer: (server) => {
			server.middlewares.use(
				createBuildAssetsMiddleware(server.config.base, outputFileMap),
			);
		},
	};
}

function checkAndHandleEtag(
	req: Connect.IncomingMessage,
	res: ServerResponse,
	etag: string,
): boolean {
	if (req.headers["if-none-match"] === etag) {
		res.statusCode = 304;
		res.end();

		return true;
	}

	return false;
}

function createBuildAssetsMiddleware(
	basePath: string,
	buildResultFiles: ReadonlyMap<string, import("esbuild").OutputFile>,
): Connect.NextHandleFunction {
	return function buildAssetsMiddleware(req, res, next) {
		if (req.url === undefined || res.writableEnded) {
			return;
		}

		const pathname =
			basePath !== "/" && req.url.startsWith(basePath) ?
				req.url.slice(0, basePath.length - 1)
			:	req.url;
		const extension = posix.extname(pathname);
		if (extension && !/\.[mc]?[jt]s(?:\.map)?$/.test(extension)) {
			const outputFile = buildResultFiles.get(pathname.slice(1));
			if (outputFile) {
				const contents = outputFile.contents;

				const etag = `W/${createHash("sha256").update(contents).digest("hex")}`;
				if (checkAndHandleEtag(req, res, etag)) {
					return;
				}

				const mimeType = lookupMimeType(extension);
				if (mimeType) {
					res.setHeader("Content-Type", mimeType);
				}

				res.setHeader("ETag", etag);
				res.setHeader("Cache-Control", "no-cache");
				res.end(contents);

				return;
			}
		}

		next();
	};
}

export async function createVitest(
	context: BuilderContext,
	input: Schema,
	outputFileMap: ReadonlyMap<string, import("esbuild").OutputFile>,
	testToEntryPointMap: ReadonlyMap<string, string>,
) {
	let startVitest;
	try {
		({startVitest} = await import("vitest/node"));
	} catch {
		throw new BuildFailureError(
			"Please install vitest to run @snuggery/build-lit:vitest",
		);
	}

	let vitestConfigPath: string | false | undefined;
	if (typeof input.vitestConfig === "string") {
		vitestConfigPath = resolveWorkspacePath(context, input.vitestConfig);
	} else {
		vitestConfigPath = input.vitestConfig ? undefined : false;
	}

	const debugOptions: CliOptions =
		input.debug ?
			{
				inspectBrk: true,
				isolate: false,
				fileParallelism: false,
			}
		:	{};

	const projectName = "test";

	const cliOptions: CliOptions = {
		allowOnly: !process.env.CI,
		watch: input.watch,
		ui: input.ui,
		...debugOptions,
		config: vitestConfigPath,
		project: projectName,
		root: await getProjectPath(context),
	};

	const virtualFilePlugin = createVirtualFilePlugin(
		context,
		outputFileMap,
		testToEntryPointMap,
	);

	const configPlugin = await createVitestConfigPlugin({
		projectName,
		input,
		context,
		browser: await getBrowserConfig(input, context),
		files: Array.from(testToEntryPointMap.keys()),
		plugins: [virtualFilePlugin],
	});

	const viteOverrides: UserConfig = {
		plugins: [configPlugin],
		server: {
			watch: null,
		},
	};

	const vitest = await startVitest(
		"test",
		undefined,
		cliOptions,
		viteOverrides,
	);

	context.addTeardown(() => vitest.close());

	return vitest;
}

export function isSuccessful(vitest: import("vitest/node").Vitest) {
	return vitest.state.getTestModules().every((mod) => mod.ok());
}
