const {readFileSync} = require('node:fs');
const {createRequire} = require('node:module');
const {dirname, join} = require('node:path');
const {resolve} = require('resolve.exports');
const sass = require('sass');

/** @type {Map<string, {exports?: unknown}>} */
const packageManifests = new Map();

/** @param {string} url */
function getPackageName(url) {
	let idx = url.indexOf('/');
	if (idx !== -1 && url.startsWith('@')) {
		idx = url.indexOf('/', idx + 1);
	}

	return idx === -1 ? url : url.slice(0, idx);
}

/** @type {import('sass').LegacySyncImporter} */
const sassResolver = (url, prev) => {
	if (url.startsWith('.')) {
		// definitely relative
		return null;
	}

	// support leading tilde
	if (url.startsWith('~')) {
		url = url.slice(1);
	}

	const packageName = getPackageName(url);
	let manifestFile;
	try {
		manifestFile = createRequire(prev).resolve(`${packageName}/package.json`);
	} catch (e) {
		if (
			/** @type {NodeJS.ErrnoException} */ (e).code ===
			'ERR_PACKAGE_PATH_NOT_EXPORTED'
		) {
			throw new Error(`Package ${packageName} doesn't expose package.json`);
		}

		return null;
	}

	let manifest = packageManifests.get(manifestFile);
	if (manifest == null) {
		manifest = /** @type {{exports?: unknown}} */ (
			JSON.parse(readFileSync(manifestFile, 'utf-8'))
		);
		// only cache the exports key, we don't care about the rest
		packageManifests.set(manifestFile, {exports: manifest.exports});
	}

	const deepImport = url.slice(packageName.length);
	return {
		file: join(
			dirname(manifestFile),
			resolve(manifest, `.${deepImport}`, {
				conditions: ['sass', 'style'],
				unsafe: true,
			}) ?? deepImport,
		),
	};
};

/**
 *
 * @param {string} file
 * @param {string} data
 * @param {boolean} indentedSyntax
 * @returns
 */
exports.compileSass = function compileSass(file, data, indentedSyntax) {
	try {
		return sass.renderSync({
			data,
			file,
			indentedSyntax,
			importer: sassResolver,
			omitSourceMapUrl: true,
		});
	} catch (e) {
		const message = /** @type {Error} */ (e).message || String(e);
		throw new Error(
			`Failed to compile ${
				indentedSyntax ? 'SASS' : 'SCSS'
			} in ${file}: ${message}`,
		);
	}
};

exports.info = sass.info;
