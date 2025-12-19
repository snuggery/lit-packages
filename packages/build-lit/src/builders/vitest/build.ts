import type {BuilderContext} from "@snuggery/architect";
import type {Plugin, BuildResult, OutputFile} from "esbuild";

import {context as createEsbuildContext} from "../../esbuild.js";
import {forwardEsbuildOptions} from "../../helpers/esbuild-options.js";
import {assetPlugin} from "../../plugins/asset.js";
import {createCssResourcePlugin} from "../../plugins/css-resources.js";
import {nodeModulesExternalPlugin} from "../../plugins/external.js";
import {sassPlugin} from "../../plugins/sass.js";

import type {Schema} from "./schema.js";

function trackRebuildsPlugin(): Plugin &
	AsyncIterable<BuildResult<{write: false}>> {
	let nextValue: BuildResult | null = null;
	const queue: ((value?: BuildResult) => void)[] = [];

	return {
		name: "@snuggery/build-lit:track-builds",
		setup(build) {
			build.onEnd((result) => {
				if (queue.length) {
					queue.shift()!(result);
				} else {
					nextValue = result;
				}
			});

			build.onDispose(() => {
				for (const item of queue) {
					item(undefined);
				}
				queue.length = 0;
			});
		},

		[Symbol.asyncIterator]: () => ({
			async next() {
				if (nextValue != null) {
					let value;
					[value, nextValue] = [nextValue, null];
					return {value};
				}

				return new Promise((resolve) =>
					queue.push((value) =>
						value ? resolve({value}) : resolve({done: true, value}),
					),
				);
			},
		}),
	};
}

export async function* build(
	context: BuilderContext,
	input: Schema,
	entryPointToFiles: ReadonlyMap<string, string>,
): AsyncGenerator<Map<string, OutputFile>, void, void> {
	const buildTracker = trackRebuildsPlugin();
	const plugins = [
		assetPlugin(),
		createCssResourcePlugin(),
		nodeModulesExternalPlugin(),
		sassPlugin(),
		buildTracker,
	];

	const esbuildContext = await createEsbuildContext({
		absWorkingDir: context.workspaceRoot,

		entryPoints: Array.from(entryPointToFiles, ([entryPoint, file]) => ({
			in: file,
			out: entryPoint,
		})),
		format: "esm",

		bundle: true,

		plugins,

		...forwardEsbuildOptions(input),

		sourcemap: "external",
		sourcesContent: false,

		write: false,
		outdir: "/",
	});

	await esbuildContext.rebuild();

	if (input.watch) {
		context.addTeardown(() => esbuildContext.dispose());

		await esbuildContext.watch();
	} else {
		await esbuildContext.dispose();
	}

	for await (const result of buildTracker) {
		if (result.errors?.length) {
			continue;
		}

		yield new Map(result.outputFiles.map((file) => [file.path.slice(1), file]));
	}
}
