import {readFile} from "node:fs/promises";
import {dirname, extname} from "node:path";
import {fileURLToPath, pathToFileURL} from "node:url";

import {
	DirectoryEntry,
	createModuleCanonicalizer,
	createRelativeCanonicalizer,
} from "./sass/canonicalize.js";
import {createSassLoader} from "./sass/load.js";

export function sassPlugin(): import("esbuild").Plugin {
	return {
		name: "@snuggery/build-lit:sass",
		setup(build) {
			let sassPromise: Promise<typeof import("sass")> | undefined = undefined;

			build.onResolve(
				{
					filter: /\.(?:sass|scss|css)$/,
				},
				async ({importer, kind, path, pluginData, ...rest}) => {
					if (pluginData?.litSass) {
						return;
					}

					pluginData = {
						...pluginData,
						litSass:
							kind !== "entry-point" && /\.[cm]?[tj]sx?$/.test(importer) ?
								"lit"
							:	"css",
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

			const directoryCache = new Map<string, DirectoryEntry>();

			build.onEnd(() => {
				directoryCache.clear();
			});

			build.onLoad(
				{filter: /\.(?:sass|scss|css)$/},
				async ({path, pluginData}) => {
					if (!pluginData?.litSass) {
						return null;
					}
					const litSass: "css" | "lit" = pluginData.litSass;
					pluginData = {...pluginData};
					delete pluginData.litSass;

					let css: string, watchFiles: string[];

					const entryDirectory = dirname(path);

					switch (extname(path)) {
						case ".sass":
						case ".scss":
							{
								if (sassPromise == null) {
									sassPromise = import("sass").then((m) =>
										// @ts-expect-error Either if or else is impossible according to typescript
										"compile" in m ? m : m.default,
									);
								}

								const {compileString} = await sassPromise;
								const load = createSassLoader(
									entryDirectory,
									litSass === "css",
								);

								const result = compileString(await readFile(path, "utf-8"), {
									url: pathToFileURL(path),
									importer: {
										canonicalize: createRelativeCanonicalizer(directoryCache),
										load,
									},
									importers: [
										{
											canonicalize: createModuleCanonicalizer(directoryCache),
											load,
										},
									],
								});

								css = result.css;
								watchFiles = result.loadedUrls
									.filter((url) => url.protocol === "file:")
									.map((url) => fileURLToPath(url));
							}
							break;
						default:
							watchFiles = [path];
							css = await readFile(path, "utf-8");
					}

					if (litSass === "css") {
						return {
							loader: "css",
							contents: css,
							watchFiles,
						};
					}

					css = (
						await build.esbuild.transform(css, {
							banner: build.initialOptions.banner?.css,
							footer: build.initialOptions.footer?.css,
							loader: "css",
							target: build.initialOptions.target,
							minify: build.initialOptions.minify,
						})
					).code;

					return {
						loader: "js",
						contents: `import {css} from 'lit';\nexport default css\`${css
							.replace(/`/g, "\\x60")
							.replace(/\$\{/g, "\\${")}\`;\n`,
						watchFiles,
					};
				},
			);
		},
	};
}
