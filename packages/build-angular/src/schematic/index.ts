// cspell:words subdirs subfiles

import {normalize, join, resolve, Path} from '@angular-devkit/core';
import {type Rule, SchematicsException} from '@angular-devkit/schematics';
import {filterByPatterns} from '@snuggery/core';
import {getWorkspace, createProgram, ts} from '@snuggery/schematics';

import {collectEvents} from './collect-events.js';
import {collectProperties} from './collect-properties.js';
import {findClass} from './find-class.js';
import {findAllDefinedElements} from './find-defined-elements.js';
import type {Schema} from './schema.js';
import {write} from './writer.js';

export default function ({
	exclude,
	include = '*',
	outputDirectory,
	project,
	workspaceProjectName,
}: Schema): Rule {
	return async (tree, context) => {
		if (outputDirectory == null) {
			if (workspaceProjectName == null) {
				throw new SchematicsException(
					`Couldn't figure out outputDirectory, pass it as option`,
				);
			}

			const workspace = await getWorkspace(tree);
			const projectInstance = workspace.projects.get(workspaceProjectName);

			if (projectInstance == null) {
				throw new SchematicsException(
					`Couldn't find project ${JSON.stringify(workspaceProjectName)}`,
				);
			}

			if (outputDirectory == null) {
				outputDirectory = join(normalize(projectInstance.root), 'generated');
			}
		}

		outputDirectory = resolve('/' as Path, normalize(outputDirectory));

		const program = await createProgram({
			tree,
			logger: context.logger,
			project,
			workspaceProjectName,
		});

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
