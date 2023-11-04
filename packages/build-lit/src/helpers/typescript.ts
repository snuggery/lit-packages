import {
	type BuilderContext,
	BuildFailureError,
	resolveWorkspacePath,
} from '@snuggery/architect';
import {dirname} from 'node:path';
import type {
	ParsedCommandLine,
	Program,
	FormatDiagnosticsHost,
} from 'typescript';

// eslint-disable-next-line import/no-mutable-exports
export let getTypescript: () => Promise<typeof import('typescript')> = () => {
	const typescript = import('typescript').then(
		m => m.default,
		() => {
			throw new Error(
				`Couldn't find typescript, did you enable a feature that requires typescript without installing it?`,
			);
		},
	);
	getTypescript = () => typescript;

	return typescript;
};

export async function getFormatDiagnosticsHost(
	context: BuilderContext,
): Promise<FormatDiagnosticsHost> {
	const ts = await getTypescript();
	return {
		getCurrentDirectory: () => context.workspaceRoot,
		// We need to normalize the path separators here because by default, TypeScript
		// compiler hosts use posix canonical paths. In order to print consistent diagnostics,
		// we also normalize the paths.
		getCanonicalFileName: fileName => fileName,
		getNewLine: () => ts.sys.newLine,
	};
}

export async function createProgram(
	context: BuilderContext,
	options: {
		inputFiles?: string[];
		tsconfig?: string;
		tsConfig?: never;
		oldProgram?: Program;
	},
): Promise<Program> {
	if (options.inputFiles?.length) {
		return createProgramFromFiles(
			context,
			await glob(context, options.inputFiles),
			options,
		);
	} else if (options.tsconfig) {
		return createProgramFromConfig(context, options.tsconfig);
	} else {
		throw new BuildFailureError(
			'Expected inputFiles or tsconfig to be provided',
		);
	}
}

export async function getFiles(
	context: BuilderContext,
	options: {
		inputFiles?: string[];
		tsconfig?: string;
		tsConfig?: never;
	},
): Promise<string[]> {
	if (options.inputFiles?.length) {
		return await glob(context, options.inputFiles);
	} else if (options.tsconfig) {
		return Array.from(
			(
				await createProgramFromConfig(context, options.tsconfig)
			).getRootFileNames(),
		);
	} else {
		throw new BuildFailureError(
			'Expected inputFiles or tsconfig to be provided',
		);
	}
}

export async function createProgramFromCommandLine(
	commandLine: ParsedCommandLine,
	oldProgram?: Program,
): Promise<Program> {
	const ts = await getTypescript();

	return ts.createProgram({
		options: commandLine.options,
		rootNames: commandLine.fileNames,
		configFileParsingDiagnostics: commandLine.errors,
		projectReferences: commandLine.projectReferences,
		oldProgram,
	});
}

async function createProgramFromFiles(
	context: BuilderContext,
	inputFiles: string[],
	opts: {tsconfig?: string; tsConfig?: never; oldProgram?: Program},
): Promise<Program> {
	const ts = await getTypescript();

	let parsedCommandLine: ParsedCommandLine;
	if (opts.tsconfig) {
		parsedCommandLine = await parseCommandLine(context, opts.tsconfig);
		parsedCommandLine.fileNames = inputFiles;
	} else {
		parsedCommandLine = ts.parseJsonConfigFileContent(
			{
				compilerOptions: {},
				files: inputFiles,
			},
			ts.sys,
			context.workspaceRoot,
		);
	}

	return await createProgramFromCommandLine(parsedCommandLine, opts.oldProgram);
}

async function createProgramFromConfig(
	context: BuilderContext,
	tsconfig: string,
	oldProgram?: Program,
): Promise<Program> {
	return await createProgramFromCommandLine(
		await parseCommandLine(context, tsconfig),
		oldProgram,
	);
}

async function parseCommandLine(context: BuilderContext, tsconfig: string) {
	const ts = await getTypescript();

	const resolvedConfigPath = resolveWorkspacePath(context, tsconfig);

	const rawTsConfig = ts.readConfigFile(resolvedConfigPath, ts.sys.readFile);
	if (rawTsConfig.error) {
		throw new Error(
			ts.formatDiagnostic(
				rawTsConfig.error,
				await getFormatDiagnosticsHost(context),
			),
		);
	}

	return ts.parseJsonConfigFileContent(
		rawTsConfig.config,
		ts.sys,
		dirname(resolvedConfigPath),
	);
}

async function glob(context: BuilderContext, patterns: string[]) {
	const {default: glob} = await import('fast-glob');

	return await glob(patterns, {
		cwd: context.workspaceRoot,
		absolute: true,

		onlyFiles: true,
		braceExpansion: true,
	});
}
