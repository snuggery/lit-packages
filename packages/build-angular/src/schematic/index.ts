// cspell:words subdirs subfiles

import {normalize, join, dirname, resolve, Path} from '@angular-devkit/core';
import {Rule, SchematicsException} from '@angular-devkit/schematics';
import {filterByPatterns} from '@snuggery/core';
import {getWorkspace} from '@snuggery/schematics';
import ts, {sys} from 'typescript';

import {collectEvents} from './collect-events.js';
import {collectProperties} from './collect-properties.js';
import {findClass} from './find-class.js';
import {findAllDefinedElements} from './find-defined-elements.js';
import type {Schema} from './schema.js';
import {write} from './writer.js';

export const fsProjectPrefix = '/__project__';

export default function ({
	exclude,
	include = '*',
	outputDirectory,
	project,
	angularProjectName,
}: Schema): Rule {
	return async (tree, context) => {
		if (project == null || outputDirectory == null) {
			if (angularProjectName == null) {
				throw new SchematicsException(
					`Couldn't figure out tsConfig or outputDirectory, pass these options`,
				);
			}

			const workspace = await getWorkspace(tree);
			const projectInstance = workspace.projects.get(angularProjectName);

			if (projectInstance == null) {
				throw new SchematicsException(
					`Couldn't find project ${JSON.stringify(angularProjectName)}`,
				);
			}

			if (project == null) {
				project = projectInstance.root;
			}

			if (outputDirectory == null) {
				outputDirectory = join(normalize(projectInstance.root), 'generated');
			}
		}

		outputDirectory = resolve('/' as Path, normalize(outputDirectory));

		if (tree.exists(join(normalize(project), 'tsconfig.json'))) {
			project = join(normalize(project), 'tsconfig.json');
		} else if (tree.exists(join(normalize(project), 'jsconfig.json'))) {
			project = join(normalize(project), 'jsconfig.json');
		}

		const startsWithFsProjectPrefix = (path: string) =>
			path.startsWith(fsProjectPrefix);
		const stripFsProjectPrefix = (path: string) =>
			path.slice(fsProjectPrefix.length);

		const treeSys: ts.System = {
			args: [],
			createDirectory: path => {
				if (startsWithFsProjectPrefix(path)) {
					// unsupported by the Tree
				} else {
					return ts.sys.createDirectory(path);
				}
			},
			deleteFile: path => {
				if (startsWithFsProjectPrefix(path)) {
					tree.delete(stripFsProjectPrefix(path));
				} else {
					ts.sys.deleteFile?.(path);
				}
			},
			directoryExists: path => {
				if (path == fsProjectPrefix) {
					return true;
				}

				if (!startsWithFsProjectPrefix(path)) {
					return ts.sys.directoryExists(path);
				}

				path = stripFsProjectPrefix(path);

				if (tree.exists(path)) {
					return false;
				}

				const dir = tree.getDir(path);
				return dir.subfiles.length > 0 || dir.subdirs.length > 0;
			},
			fileExists: path => {
				if (startsWithFsProjectPrefix(path)) {
					return tree.exists(stripFsProjectPrefix(path));
				} else {
					return ts.sys.fileExists(path);
				}
			},
			getCurrentDirectory: () => fsProjectPrefix,
			getDirectories: path => {
				if (startsWithFsProjectPrefix(path)) {
					return tree.getDir(stripFsProjectPrefix(path)).subdirs;
				} else {
					return ts.sys.getDirectories(path);
				}
			},
			newLine: '\n',
			readDirectory: path => {
				if (startsWithFsProjectPrefix(path)) {
					const dir = tree.getDir(stripFsProjectPrefix(path));
					return [...dir.subfiles, ...dir.subdirs].map(p =>
						join(path as Path, p),
					);
				} else {
					return ts.sys.readDirectory(path);
				}
			},
			readFile: path => {
				if (startsWithFsProjectPrefix(path)) {
					return tree.read(stripFsProjectPrefix(path))?.toString('utf-8');
				} else {
					return ts.sys.readFile(path);
				}
			},
			realpath: path => path,
			resolvePath: path => resolve(fsProjectPrefix as Path, normalize(path)),
			writeFile: (path, content, writeBOM) => {
				if (startsWithFsProjectPrefix(path)) {
					path = stripFsProjectPrefix(path);

					if (tree.exists(path)) {
						tree.overwrite(path, content);
					} else {
						tree.create(path, content);
					}
				} else {
					ts.sys.writeFile(path, content, writeBOM);
				}
			},
			useCaseSensitiveFileNames: ts.sys.useCaseSensitiveFileNames,
			write: content => context.logger.debug(content),
			exit: ts.sys.exit,
			getExecutingFilePath: () => {
				throw new SchematicsException('not implemented');
			},
		};

		const formatDiagnosticHost: ts.FormatDiagnosticsHost = {
			getCanonicalFileName: normalize,
			getCurrentDirectory: sys.getCurrentDirectory,
			getNewLine: () => '\n',
		};

		let fileNames: string[];
		let options: ts.CompilerOptions;
		let projectReferences: readonly ts.ProjectReference[] | undefined;
		let errors: ts.Diagnostic[];

		if (tree.exists(project)) {
			const {config, error} = ts.readConfigFile(
				`${fsProjectPrefix}/${project}`,
				treeSys.readFile,
			);

			if (error) {
				context.logger.error(ts.formatDiagnostic(error, formatDiagnosticHost));
				process.exit(1);
			}

			({fileNames, options, projectReferences, errors} =
				ts.parseJsonConfigFileContent(
					config,
					treeSys,
					dirname(normalize(`${fsProjectPrefix}/${project}`)),
					undefined,
					project,
				));

			options.noEmit = true;
		} else {
			({fileNames, options, projectReferences, errors} =
				ts.parseJsonConfigFileContent(
					{
						compilerOptions: {
							allowJs: true,
							noEmit: true,
							skipLibCheck: true,
							experimentalDecorators: true,
							target: 'esnext',
							module: 'commonjs',
							moduleResolution: 'node',
						},
					},
					treeSys,
					normalize(`${fsProjectPrefix}/${project}`),
				));
		}

		const compilerHost = ts.createCompilerHost(options, true);

		{
			const {
				directoryExists,
				fileExists,
				getCurrentDirectory,
				getDirectories,
				newLine,
				readDirectory,
				readFile,
				realpath,
			} = treeSys;

			Object.assign(compilerHost, {
				directoryExists,
				fileExists,
				getCurrentDirectory,
				getDirectories,
				getNewLine: () => newLine,
				readDirectory,
				readFile,
				realpath,
			});
		}

		const program = ts.createProgram({
			host: compilerHost,
			options,
			rootNames: fileNames,
			projectReferences,
			configFileParsingDiagnostics: errors,
		});

		{
			let hasError = false;

			for (const diagnostic of [
				...program.getGlobalDiagnostics(),
				...program.getOptionsDiagnostics(),
				...program.getSemanticDiagnostics(),
				...program.getSyntacticDiagnostics(),
				...program.getDeclarationDiagnostics(),
				...program.getConfigFileParsingDiagnostics(),
			]) {
				switch (diagnostic.category) {
					case ts.DiagnosticCategory.Error:
						hasError = true;
						context.logger.error(
							ts.formatDiagnostic(diagnostic, formatDiagnosticHost),
						);
						break;
					case ts.DiagnosticCategory.Warning:
						context.logger.warn(
							ts.formatDiagnostic(diagnostic, formatDiagnosticHost),
						);
						break;
					default:
						context.logger.info(
							ts.formatDiagnostic(diagnostic, formatDiagnosticHost),
						);
						break;
				}
			}

			if (hasError) {
				throw new SchematicsException(
					'Fix compilation errors before continuing',
				);
			}
		}

		const definedCustomElements = findAllDefinedElements(program);

		context.logger.info(
			`Found custom elements: ${Array.from(definedCustomElements.keys()).join(
				', ',
			)}`,
		);

		const includedCustomElements = filterByPatterns(
			Array.from(definedCustomElements.keys()),
			{include, exclude},
		);

		if (includedCustomElements.length !== definedCustomElements.size) {
			context.logger.info(
				`The following elements are included: ${includedCustomElements.join(
					', ',
				)}`,
			);
		}

		for (const name of includedCustomElements) {
			const node = definedCustomElements.get(name)!;

			let classType;
			try {
				classType = findClass(program, node);
			} catch (e) {
				context.logger.error(
					`Failed to find class for custom element ${name}, skipping element...`,
				);
				continue;
			}

			const {properties, methods} = collectProperties(classType);
			const events = collectEvents(
				node.getSourceFile(),
				classType,
				program.getTypeChecker(),
			);

			write(tree, name, outputDirectory, {
				classNode: classType.symbol.valueDeclaration as ts.ClassDeclaration,
				properties,
				methods,
				events,
			});
		}
	};
}
