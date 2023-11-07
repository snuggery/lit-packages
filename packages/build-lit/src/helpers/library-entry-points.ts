import type {JsonObject} from '@snuggery/core';

interface ExportObject {
	[pathOrCondition: string]: ExportValue;
}

type ExportValue = ExportObject | string | null | ExportValue[];

export interface LibraryEntryPoint {
	exportKey: string;
	outputBasename: string;
	inputFilename: string;
}

export function extractLibraryEntryPoints(
	packageJson: JsonObject,
): LibraryEntryPoint[] {
	const exports = packageJson.exports as ExportValue | undefined;

	if (exports == null) {
		const inputFilename =
			typeof packageJson.main === 'string'
				? ensureRelative(packageJson.main)
				: './index.js';

		packageJson.exports = {'.': inputFilename};

		delete packageJson.main;

		return [{exportKey: '.', outputBasename: './index', inputFilename}];
	}

	if (typeof exports === 'string' || Array.isArray(exports)) {
		packageJson.exports = {
			'.': exports,
		};

		const inputFilename = getInputFilename(exports);
		if (inputFilename == null) {
			return [];
		}

		return [{exportKey: '.', outputBasename: './index', inputFilename}];
	}

	let exportKeys = Object.keys(exports);
	if (exportKeys.length === 0) {
		return [];
	}

	if (!exportKeys[0]?.startsWith('./')) {
		packageJson.exports = {'.': exports};
		exportKeys = ['.'];
	}

	return exportKeys
		.map(key => [key, getInputFilename(exports[key]!)] as const)
		.filter(
			(v): v is readonly [string, string] =>
				v[1] != null &&
				/\.[cm]?[jt]sx?$/.test(v[1]) &&
				!/\.d\.[cm]?ts$/.test(v[1]),
		)
		.map(([exportKey, inputFilename]) => ({
			exportKey,
			inputFilename,
			outputBasename: exportKey === '.' ? './index' : exportKey,
		}));
}

function getInputFilename(exports: ExportValue): string | null {
	if (exports == null || typeof exports === 'string') {
		return exports;
	}

	if (Array.isArray(exports)) {
		for (const value of exports) {
			const result = getInputFilename(value);
			if (result != null) {
				return result;
			}
		}

		return null;
	}

	return getInputFilename(
		exports.snuggery ?? exports.import ?? exports.default ?? null,
	);
}

function ensureRelative(value: string) {
	return value.startsWith('./') ? value : `./${value}`;
}
