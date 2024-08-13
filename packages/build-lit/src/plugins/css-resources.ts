/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {readFile} from "node:fs/promises";
import {join, relative} from "node:path";

const CSS_RESOURCE_NAMESPACE = "lit:css-resource";

/**
 * Creates an esbuild Plugin that loads all CSS url token references using the
 * built-in esbuild `file` loader. A plugin is used to allow for all file extensions
 * and types to be supported without needing to manually specify all extensions
 * within the build configuration.
 *
 * @returns An esbuild Plugin instance.
 */
export function createCssResourcePlugin(): import("esbuild").Plugin {
	return {
		name: "css-resource",
		setup(build): void {
			build.onResolve({filter: /.*/}, async (args) => {
				const {
					importer,
					path,
					kind,
					resolveDir,
					namespace,
					pluginData = {},
				} = args;

				// Only attempt to resolve url tokens which only exist inside CSS.
				// Also, skip this plugin if already attempting to resolve the url-token.
				if (kind !== "url-token" || pluginData.litCssResource) {
					return null;
				}

				let [containingDir, resourceUrl] = path.split("||file:", 2) as [
					string,
					string | undefined,
				];
				if (resourceUrl === undefined) {
					// This can happen due to early exit checks in rebasing-importer
					// logic such as when the url is an external URL.
					resourceUrl = containingDir;
					containingDir = "";
				}

				// If root-relative, absolute or protocol relative url, mark as external to leave the
				// path/URL in place.
				if (/^((?:\w+:)?\/\/|data:|chrome:|#|\/)/.test(resourceUrl)) {
					return {
						path: resourceUrl,
						external: true,
					};
				}

				pluginData.litCssResource = true;

				const result = await build.resolve(resourceUrl, {
					importer,
					kind,
					namespace,
					pluginData,
					resolveDir: join(resolveDir, containingDir),
				});

				// Return results that are not files since these are most likely specific to another plugin
				// and cannot be loaded by this plugin.
				if (result.namespace !== "file") {
					return result;
				}

				// All file results are considered CSS resources and will be loaded via the file loader
				return {
					...result,
					// Use a relative path to prevent fully resolved paths in the metafile (JSON stats file).
					// This is only necessary for custom namespaces. esbuild will handle the file namespace.
					path: relative(build.initialOptions.absWorkingDir ?? "", result.path),
					namespace: CSS_RESOURCE_NAMESPACE,
				};
			});

			build.onLoad(
				{filter: /./, namespace: CSS_RESOURCE_NAMESPACE},
				async (args) => {
					const resourcePath = join(
						build.initialOptions.absWorkingDir ?? "",
						args.path,
					);

					return {
						contents: await readFile(resourcePath),
						loader: "file",
						watchFiles: [resourcePath],
					};
				},
			);
		},
	};
}
