import {realpath} from "node:fs/promises";

/**
 * Plugin that marks all imported packages as external
 */
export function externalPlugin(): import("esbuild").Plugin {
	return {
		name: "@snuggery/build-lit:external",
		setup(build) {
			build.onResolve(
				{
					filter: /^[@a-zA-Z]/,
				},
				() => ({external: true}),
			);
		},
	};
}

/**
 * Plugin that marks all files resolved to node_modules as external
 */
export function nodeModulesExternalPlugin(): import("esbuild").Plugin {
	const kPluginActive = Symbol();
	const realPathCache = new Map<string, string>();

	return {
		name: "@snuggery/build-lit:node-modules-external",
		setup(build) {
			build.onResolve(
				{
					filter: /./,
					namespace: "file",
				},
				async ({
					path,
					importer,
					kind,
					namespace,
					pluginData,
					resolveDir,
					with: _with,
				}) => {
					if (pluginData?.[kPluginActive]) {
						return null;
					}

					const result = await build.resolve(path, {
						importer,
						kind,
						namespace,
						pluginData: {
							...pluginData,
							[kPluginActive]: true,
						},
						resolveDir,
						with: _with,
					});

					if (result.path.includes("/node_modules/")) {
						let path = realPathCache.get(result.path);
						if (!path) {
							path = await realpath(new URL(`file:${result.path}`));
							realPathCache.set(result.path, path);
						}

						if (path.includes("/node_modules/")) {
							return {external: true, sideEffects: result.sideEffects};
						}
					}

					return null;
				},
			);
		},
	};
}
