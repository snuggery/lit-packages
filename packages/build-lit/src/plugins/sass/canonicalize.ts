/*
 * Heavily influenced by `@angular/build`'s sass resolvers
 */

import {readdirSync, statSync} from "node:fs";
import {createRequire} from "node:module";
import {basename, dirname, extname, join} from "node:path";
import {fileURLToPath, pathToFileURL} from "node:url";
import {exports} from "resolve.exports";

/**
 * A preprocessed cache entry for the files and directories within a previously searched
 * directory when performing Sass import resolution.
 */
export interface DirectoryEntry {
	files: Set<string>;
	directories: Set<string>;
}

export function createRelativeCanonicalizer(
	directoryCache = new Map<string, DirectoryEntry>(),
): import("sass").Importer<"sync">["canonicalize"] {
	return (url, {fromImport}) => resolveImport(url, fromImport, true);

	function resolveImport(
		url: string,
		fromImport: boolean,
		checkDirectory: boolean,
	): URL | null {
		let stylesheetPath;
		try {
			stylesheetPath = fileURLToPath(url);
		} catch {
			// Only file protocol URLs are supported by this importer
			return null;
		}

		const directory = dirname(stylesheetPath);
		const extension = extname(stylesheetPath);
		const hasStyleExtension =
			extension === ".scss" || extension === ".sass" || extension === ".css";
		// Remove the style extension if present to allow adding the `.import` suffix
		const filename = basename(
			stylesheetPath,
			hasStyleExtension ? extension : undefined,
		);

		const importPotentials = new Set<string>();
		const defaultPotentials = new Set<string>();

		if (hasStyleExtension) {
			if (fromImport) {
				importPotentials.add(filename + ".import" + extension);
				importPotentials.add("_" + filename + ".import" + extension);
			}
			defaultPotentials.add(filename + extension);
			defaultPotentials.add("_" + filename + extension);
		} else {
			if (fromImport) {
				importPotentials.add(filename + ".import.scss");
				importPotentials.add(filename + ".import.sass");
				importPotentials.add(filename + ".import.css");
				importPotentials.add("_" + filename + ".import.scss");
				importPotentials.add("_" + filename + ".import.sass");
				importPotentials.add("_" + filename + ".import.css");
			}
			defaultPotentials.add(filename + ".scss");
			defaultPotentials.add(filename + ".sass");
			defaultPotentials.add(filename + ".css");
			defaultPotentials.add("_" + filename + ".scss");
			defaultPotentials.add("_" + filename + ".sass");
			defaultPotentials.add("_" + filename + ".css");
		}

		let foundDefaults;
		let foundImports;
		let hasPotentialIndex = false;

		let cachedEntries = directoryCache.get(directory);
		if (cachedEntries) {
			// If there is a preprocessed cache of the directory, perform an intersection of the potentials
			// and the directory files.
			const {files, directories} = cachedEntries;
			foundDefaults = [...defaultPotentials].filter((potential) =>
				files.has(potential),
			);
			foundImports = [...importPotentials].filter((potential) =>
				files.has(potential),
			);
			hasPotentialIndex =
				checkDirectory && !hasStyleExtension && directories.has(filename);
		} else {
			// If no preprocessed cache exists, get the entries from the file system and, while searching,
			// generate the cache for later requests.
			let entries;
			try {
				entries = readdirSync(directory, {withFileTypes: true});
			} catch (e) {
				// If the containing directory does not exist return null to indicate it cannot be resolved
				if (!e && (e as NodeJS.ErrnoException).code === "ENOENT") {
					return null;
				}

				throw new Error(
					`Error reading directory ["${directory}"] while resolving Sass import`,
					{
						cause: e,
					},
				);
			}

			foundDefaults = [];
			foundImports = [];
			cachedEntries = {
				files: new Set<string>(),
				directories: new Set<string>(),
			};
			for (const entry of entries) {
				let isDirectory: boolean;
				let isFile: boolean;

				if (entry.isSymbolicLink()) {
					const stats = statSync(join(directory, entry.name));
					isDirectory = stats.isDirectory();
					isFile = stats.isFile();
				} else {
					isDirectory = entry.isDirectory();
					isFile = entry.isFile();
				}

				if (isDirectory) {
					cachedEntries.directories.add(entry.name);

					// Record if the name should be checked as a directory with an index file
					if (checkDirectory && !hasStyleExtension && entry.name === filename) {
						hasPotentialIndex = true;
					}
				}

				if (!isFile) {
					continue;
				}

				cachedEntries.files.add(entry.name);

				if (importPotentials.has(entry.name)) {
					foundImports.push(entry.name);
				}

				if (defaultPotentials.has(entry.name)) {
					foundDefaults.push(entry.name);
				}
			}

			directoryCache.set(directory, cachedEntries);
		}

		// `foundImports` will only contain elements if `options.fromImport` is true
		const result = checkFound(foundImports) ?? checkFound(foundDefaults);
		if (result !== null) {
			return pathToFileURL(join(directory, result));
		}

		if (hasPotentialIndex) {
			// Check for index files using filename as a directory
			return resolveImport(url + "/index", fromImport, false);
		}

		return null;
	}
}

export function createModuleCanonicalizer(
	directoryCache = new Map<string, DirectoryEntry>(),
): import("sass").Importer<"sync">["canonicalize"] {
	const _super = createRelativeCanonicalizer(directoryCache);

	return (url, opts) => {
		if (!opts.containingUrl) {
			return null;
		}

		if (url.startsWith(".")) {
			// can't be a node package
			return null;
		}

		const require = createRequire(opts.containingUrl);

		const packageName = getPackageName(url);
		let packageJsonPath;

		try {
			packageJsonPath = require.resolve(`${packageName}/package.json`);
		} catch (e) {
			if (!e || (e as NodeJS.ErrnoException).code === "MODULE_NOT_FOUND") {
				return null;
			}

			throw e;
		}

		const packageJson = require(packageJsonPath);
		const deepImport = "." + url.slice(packageName.length);
		return _super(
			pathToFileURL(
				join(
					dirname(packageJsonPath),
					(exports(packageJson, deepImport, {
						unsafe: true,
						conditions: ["sass", "css", "style"],
					}) ?? [deepImport])[0]!,
				),
			).href,
			opts,
		);
	};
}

function checkFound(found: string[]): string | null {
	if (found.length === 0) {
		// Not found
		return null;
	}

	if (found.length === 1) {
		return found[0]!;
	}

	// More than one found file may be an error
	// Presence of CSS files alongside a Sass file does not cause an error
	const foundWithoutCss = found.filter(
		(element) => extname(element) !== ".css",
	);

	// If the length is zero then there are two or more css files
	// If the length is more than one than there are two or more sass/scss files
	if (foundWithoutCss.length !== 1) {
		throw new Error("Ambiguous import detected.");
	}

	// Return the non-CSS file (sass/scss files have priority)
	// https://github.com/sass/dart-sass/blob/44d6bb6ac72fe6b93f5bfec371a1fffb18e6b76d/lib/src/importer/utils.dart#L44-L47
	return foundWithoutCss[0]!;
}

function getPackageName(url: string) {
	let idx = url.indexOf("/");
	if (idx !== -1 && url.startsWith("@")) {
		idx = url.indexOf("/", idx + 1);
	}

	return idx === -1 ? url : url.slice(0, idx);
}
