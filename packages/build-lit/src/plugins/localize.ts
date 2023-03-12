import type {BuilderContext} from '@angular-devkit/architect';
import type {Loader} from 'esbuild';
import {extname} from 'node:path';
import type {Program, SourceFile} from 'typescript';

import {
	createProgram,
	createProgramFromCommandLine,
	getFormatDiagnosticsHost,
	getTypescript,
} from '../helpers/typescript.js';

import type {Config} from '#@lit/localize-tools/lib/types/config.js';
import type {Locale} from '#@lit/localize-tools/lib/types/locale.js';
import type {TransformOutputConfig} from '#@lit/localize-tools/lib/types/modes.js';

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

export async function localizePluginFactory(
	context: BuilderContext,
	config: Config & {
		output: TransformOutputConfig;
	},
): Promise<ReadonlyMap<Locale, import('esbuild').Plugin>> {
	const {TransformLitLocalizer} = await import(
		'#@lit/localize-tools/lib/modes/transform.js'
	);
	const ts = await getTypescript();
	const formatDiagnosticHost = await getFormatDiagnosticsHost(context);

	const programs = new Map<string, [Program, SourceFile]>();

	if (config.inputFiles) {
		const program = await createProgram(context, {
			inputFiles: config.inputFiles,
			tsconfig: config.tsConfig,
		});

		for (const sourceFile of program.getSourceFiles()) {
			programs.set(sourceFile.fileName, [program, sourceFile]);
		}
	} else {
		const rootProgram = await createProgram(context, {
			inputFiles: config.inputFiles,
			tsconfig: config.tsConfig,
		});

		const queue = [rootProgram];
		const handled = new Set<string>();

		let currentProgram;
		while ((currentProgram = queue.shift())) {
			for (const file of currentProgram.getSourceFiles()) {
				programs.set(file.fileName, [currentProgram, file]);
			}

			const references = currentProgram.getResolvedProjectReferences();
			if (references == null) {
				continue;
			}

			for (const reference of references) {
				if (reference != null && !handled.has(reference.sourceFile.fileName)) {
					handled.add(reference.sourceFile.fileName);

					queue.push(await createProgramFromCommandLine(reference.commandLine));
				}
			}
		}
	}

	const localizer = new TransformLitLocalizer(config);
	const printer = ts.createPrinter();

	return new Map(
		Array.from(
			localizer.transformers().entries(),
			([locale, transformerFactory]) => [
				locale,
				{
					name: '@snuggery/build-lit:localize',
					setup(build) {
						build.onLoad({filter: /\.[cm]?[jt]sx?/}, async ({path}) => {
							const programAndSourceFile = programs.get(path);
							if (programAndSourceFile == null) {
								return null;
							}
							const [program, sourceFile] = programAndSourceFile;
							if (sourceFile == null) {
								return null;
							}

							const result = ts.transform(
								sourceFile,
								[transformerFactory(program)],
								program.getCompilerOptions(),
							);

							const errors = result.diagnostics?.filter(
								diagnostic =>
									diagnostic.category === ts.DiagnosticCategory.Error,
							);

							return {
								loader: loaders[extname(path)],
								contents: printer.printFile(result.transformed[0]!),
								errors: errors?.length
									? errors.map(diagnostic => {
											const location =
												diagnostic.file.getLineAndCharacterOfPosition(
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
				},
			],
		),
	);
}
