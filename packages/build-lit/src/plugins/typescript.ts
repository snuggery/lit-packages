import type {BuilderContext} from '@snuggery/architect';
import type {Loader} from 'esbuild';
import {extname} from 'node:path';
import type {Program, SourceFile, TransformerFactory} from 'typescript';

import {
	createProgram,
	createProgramFromCommandLine,
	getFormatDiagnosticsHost,
	getTypescript,
} from '../helpers/typescript.js';

/* cspell:disable */
const loaders: Record<string, Loader> = {
	'.cjs': 'js',
	'.js': 'js',
	'.mjs': 'js',
	'.cjsx': 'jsx',
	'.jsx': 'jsx',
	'.mjsx': 'jsx',

	'.cts': 'ts',
	'.ts': 'ts',
	'.mts': 'ts',
	'.ctsx': 'tsx',
	'.tsx': 'tsx',
	'.mtsx': 'tsx',
};
/* cspell:enable */

export type TransformerFactoryFactory = (
	program: Program,
) => TransformerFactory<SourceFile>;

export async function typescriptPluginFactory(
	context: BuilderContext,
	config: {
		inputFiles?: string[];
		tsConfig?: string;
	},
	transformerFactories: TransformerFactoryFactory[],
): Promise<import('esbuild').Plugin> {
	const ts = await getTypescript();
	const formatDiagnosticHost = await getFormatDiagnosticsHost(context);

	let programs: ReadonlyMap<string | null, Program> = new Map();
	let sourceFiles: ReadonlyMap<string, [Program, SourceFile]> = new Map();
	const printer = ts.createPrinter();

	return {
		name: '@snuggery/build-lit:typescript',
		setup(build) {
			build.onStart(async () => {
				const newPrograms = new Map<string | null, Program>();
				const newSourceFiles = new Map<string, [Program, SourceFile]>();

				if (config.inputFiles) {
					const program = await createProgram(context, {
						inputFiles: config.inputFiles,
						tsconfig: config.tsConfig,
						oldProgram: programs.get(null),
					});

					newPrograms.set(null, program);
					for (const sourceFile of program.getSourceFiles()) {
						newSourceFiles.set(sourceFile.fileName, [program, sourceFile]);
					}
				} else {
					const rootProgram = await createProgram(context, {
						inputFiles: config.inputFiles,
						tsconfig: config.tsConfig,
						oldProgram: programs.get(null),
					});
					newPrograms.set(null, rootProgram);

					const queue = [rootProgram];

					let currentProgram;
					while ((currentProgram = queue.shift())) {
						for (const file of currentProgram.getSourceFiles()) {
							newSourceFiles.set(file.fileName, [currentProgram, file]);
						}

						const references = currentProgram.getResolvedProjectReferences();
						if (references == null) {
							continue;
						}

						for (const reference of references) {
							if (
								reference != null &&
								!newPrograms.has(reference.sourceFile.fileName)
							) {
								const referencedProgram = await createProgramFromCommandLine(
									reference.commandLine,
									programs.get(reference.sourceFile.fileName),
								);
								newPrograms.set(
									reference.sourceFile.fileName,
									referencedProgram,
								);
							}
						}
					}
				}

				programs = newPrograms;
				sourceFiles = newSourceFiles;
			});

			build.onLoad({filter: /\.[cm]?[jt]sx?$/}, async ({path}) => {
				const programAndSourceFile = sourceFiles.get(path);
				if (programAndSourceFile == null) {
					return null;
				}
				const [program, sourceFile] = programAndSourceFile;
				if (sourceFile == null) {
					return null;
				}

				const result = ts.transform(
					sourceFile,
					transformerFactories.map(factory => factory(program)),
					program.getCompilerOptions(),
				);

				const errors = result.diagnostics?.filter(
					diagnostic => diagnostic.category === ts.DiagnosticCategory.Error,
				);

				return {
					loader: loaders[extname(path)],
					contents: printer.printFile(result.transformed[0]!),
					errors: errors?.length
						? errors.map(diagnostic => {
								const location = diagnostic.file.getLineAndCharacterOfPosition(
									diagnostic.start,
								);
								return {
									text: ts.formatDiagnostic(
										{...diagnostic, file: undefined},
										formatDiagnosticHost,
									),
									location: {
										file: diagnostic.file.fileName,
										line: location.line,
										column: location.character,
										length: diagnostic.length,
									},
								};
						  })
						: undefined,
				};
			});
		},
	};
}
