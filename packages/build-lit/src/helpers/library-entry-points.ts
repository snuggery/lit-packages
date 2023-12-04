import {listExports} from '@bgotink/list-exports';
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

export async function extractLibraryEntryPoints(
	packageJsonPath: string,
	packageJson: JsonObject,
): Promise<LibraryEntryPoint[]> {
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

	const exportedPaths = await listExports(packageJsonPath, {
		packageJson,
		environment: 'browser',
		extraConditions: ['snuggery'],
	});

	return exportedPaths
		.filter(
			({path}) => /\.[cm]?[jt]sx?$/.test(path) && !/\.d\.[cm]?ts$/.test(path),
		)
		.map(({registeredExport, name, path}) => ({
			exportKey: registeredExport,
			inputFilename: path,
			outputBasename: name === '.' ? './index' : name.replace(/\.m?js$/, ''),
		}));
}

function ensureRelative(value: string) {
	return value.startsWith('./') ? value : `./${value}`;
}
