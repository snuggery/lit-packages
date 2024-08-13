import {readFile} from "node:fs/promises";

const assetRe = /\.(?:png|jpe?g|gif|ico|svg|avif|mp4|web[pm]|woff2?|json)$/;

export function assetPlugin(): import("esbuild").Plugin {
	return {
		name: "@snuggery/build-lit:asset",
		setup(build) {
			build.onResolve(
				{filter: assetRe},
				async ({importer, kind, path, pluginData, ...rest}) => {
					if (pluginData?.litAsset || kind === "url-token") {
						return;
					}

					pluginData = {
						...pluginData,
						litAsset:
							kind !== "entry-point" && /\.[cm]?[tj]sx?$/.test(importer) ?
								"lit"
							:	"copy",
					};

					return {
						...(await build.resolve(path, {
							importer,
							kind,
							...rest,
							pluginData,
						})),
						pluginData,
					};
				},
			);

			build.onLoad({filter: assetRe}, async ({path, pluginData}) => {
				let loader;
				switch (pluginData?.litAsset) {
					case "copy":
						loader = "copy" as const;
						break;
					case "lit":
						loader = "file" as const;
						break;
					default:
						return null;
				}

				return {
					loader,
					contents: await readFile(path),
				};
			});
		},
	};
}
