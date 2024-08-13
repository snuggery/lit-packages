/*
 * Heavily influenced by `@angular/build`'s sass resolvers
 */

import {readFileSync} from "node:fs";
import {dirname, extname, relative} from "node:path";
import {fileURLToPath} from "node:url";

import {findUrls} from "./find-urls.js";

export const createSassLoader = (
	entryDirectory: string,
	rewriteUrlImports: boolean,
) =>
	((url) => {
		const stylesheetPath = fileURLToPath(url);
		const stylesheetDirectory = dirname(stylesheetPath);
		let contents = readFileSync(stylesheetPath, "utf-8");

		if (rewriteUrlImports) {
			// Rebase any URLs that are found
			for (const {start, end, value} of findUrls(contents)) {
				// Skip if value is empty or Webpack-specific prefix
				if (value.length === 0 || value[0] === "~" || value[0] === "^") {
					continue;
				}

				// Skip if root-relative, absolute or protocol relative url
				if (/^((?:\w+:)?\/\/|data:|chrome:|\/)/.test(value)) {
					continue;
				}

				// Skip if a fragment identifier but not a Sass interpolation
				if (value[0] === "#" && value[1] !== "{") {
					continue;
				}

				// Skip if value contains a function call
				if (/#\{.+\(.+\)\}/.test(value)) {
					continue;
				}

				// Sass variable usage either starts with a `$` or contains a namespace and a `.$`
				const valueNormalized =
					value[0] === "$" || /^\w+\.\$/.test(value) ? `#{${value}}` : value;
				const rebasedPath = relative(entryDirectory, stylesheetDirectory);

				// Normalize path separators and escape characters
				// https://developer.mozilla.org/en-US/docs/Web/CSS/url#syntax
				const rebasedUrl = rebasedPath
					.replace(/\\/g, "/")
					.replace(/[()\s'"]/g, "\\$&");

				contents =
					contents.slice(0, start) +
					`"${rebasedUrl}||file:${valueNormalized}"` +
					contents.slice(end);
			}
		}

		let syntax: import("sass").Syntax | undefined;
		switch (extname(stylesheetPath).toLowerCase()) {
			case ".css":
				syntax = "css";
				break;
			case ".sass":
				syntax = "indented";
				break;
			default:
				syntax = "scss";
				break;
		}

		return {
			contents,
			syntax,
			sourceMapUrl: url,
		};
	}) satisfies import("sass").Importer<"sync">["load"];
