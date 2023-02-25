import type {BuilderContext} from '@angular-devkit/architect';
import type {Config} from '@lit/localize-tools/lib/config.js';
import type {Locale} from '@lit/localize-tools/lib/types/locale.js';
import type {TransformOutputConfig} from '@lit/localize-tools/lib/types/modes.js';
import type {Loader} from 'esbuild';
import {dirname, extname} from 'node:path';
import type {FormatDiagnosticsHost, Program, SourceFile} from 'typescript';

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
	config: Config & {output: TransformOutputConfig; tsConfig: string},
): Promise<ReadonlyMap<Locale, import('esbuild').Plugin> | {error: string}> {
	const {TransformLitLocalizer} = await import(
		'@lit/localize-tools/lib/modes/transform.js'
	);
	const {default: ts} = await import('typescript');

	const formatDiagnosticHost: FormatDiagnosticsHost = {
		getCurrentDirectory: () => context.workspaceRoot,
		// We need to normalize the path separators here because by default, TypeScript
		// compiler hosts use posix canonical paths. In order to print consistent diagnostics,
		// we also normalize the paths.
		getCanonicalFileName: fileName => fileName,
		getNewLine: () => ts.sys.newLine,
	};

	const rawTsConfig = ts.readConfigFile(config.tsConfig, ts.sys.readFile);
	if (rawTsConfig.error) {
		return {
			error: ts.formatDiagnostic(rawTsConfig.error, formatDiagnosticHost),
		};
	}

	const tsConfig = ts.parseJsonConfigFileContent(
		rawTsConfig.config,
		ts.sys,
		dirname(config.tsConfig),
	);
	if (tsConfig.errors.length) {
		return {error: ts.formatDiagnostics(tsConfig.errors, formatDiagnosticHost)};
	}

	const rootProgram = ts.createProgram({
		options: tsConfig.options,
		rootNames: tsConfig.fileNames,
		configFileParsingDiagnostics: tsConfig.errors,
		projectReferences: tsConfig.projectReferences,
	});

	const programs = new Map<string, [Program, SourceFile]>();

	{
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

					queue.push(
						ts.createProgram({
							options: reference.commandLine.options,
							rootNames: reference.commandLine.fileNames,
							configFileParsingDiagnostics: reference.commandLine.errors,
							projectReferences: reference.commandLine.projectReferences,
						}),
					);
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
					name: '@ngx-lit/build-lit:localize',
					setup(build) {
						build.onLoad({filter: /\.[cm]?[jt]sx?/}, ({path}) => {
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
								tsConfig.options,
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
