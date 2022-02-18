import ts from 'typescript';

export function findDefinedElements(
	sourceFile: ts.SourceFile,
): [string, ts.Node][] {
	const customElements: [string, ts.Node][] = [];
	const windowCustomElements: [string, ts.Node][] = [];
	const globalThisCustomElements: [string, ts.Node][] = [];

	let includeCustomElements = true;
	let includeWindowCustomElements = true;
	let includeGlobalThisCustomElements = true;

	function checkSafeNames(name: ts.Identifier) {
		switch (name.text) {
			case 'customElements':
				includeCustomElements = false;
				customElements.length = 0;
				break;
			case 'window':
				includeWindowCustomElements = false;
				windowCustomElements.length = 0;
				break;
			case 'globalThis':
				includeGlobalThisCustomElements = false;
				globalThisCustomElements.length = 0;
				break;
		}
	}

	for (const statement of sourceFile.statements) {
		if (ts.isVariableStatement(statement)) {
			for (const declaration of statement.declarationList.declarations) {
				if (ts.isIdentifier(declaration.name)) {
					checkSafeNames(declaration.name);
				}
			}
			continue;
		}

		if (ts.isImportDeclaration(statement)) {
			if (statement.importClause) {
				if (ts.isNamedImports(statement.importClause.namedBindings!)) {
					for (const {name} of statement.importClause.namedBindings.elements) {
						checkSafeNames(name);
					}
				} else if (
					ts.isNamespaceImport(statement.importClause.namedBindings!)
				) {
					checkSafeNames(statement.importClause.namedBindings.name);
				}

				if (statement.importClause.name) {
					checkSafeNames(statement.importClause.name);
				}
			}

			continue;
		}

		if (!ts.isExpressionStatement(statement)) {
			continue;
		}

		const expression = statement.expression;
		if (!ts.isCallExpression(expression)) {
			continue;
		}

		if (ts.isPropertyAccessExpression(expression.expression)) {
			if (expression.expression.name.text !== 'define') {
				continue;
			}
		} else if (ts.isElementAccessExpression(expression.expression)) {
			if (
				!ts.isStringLiteral(expression.expression.argumentExpression) ||
				expression.expression.argumentExpression.text !== 'define'
			) {
				continue;
			}
		} else {
			continue;
		}

		let result;

		if (ts.isIdentifier(expression.expression.expression)) {
			if (
				!includeCustomElements ||
				expression.expression.expression.text !== 'customElements'
			) {
				continue;
			}

			result = customElements;
		} else {
			if (ts.isPropertyAccessExpression(expression.expression.expression)) {
				if (expression.expression.expression.name.text !== 'customElements') {
					continue;
				}
			} else if (
				ts.isElementAccessExpression(expression.expression.expression)
			) {
				if (
					!ts.isStringLiteral(
						expression.expression.expression.argumentExpression,
					) ||
					expression.expression.expression.argumentExpression.text !==
						'customElements'
				) {
					continue;
				}
			} else {
				continue;
			}

			if (
				!ts.isIdentifier(expression.expression.expression.expression) ||
				((!includeWindowCustomElements ||
					expression.expression.expression.expression.text !== 'window') &&
					(!includeGlobalThisCustomElements ||
						expression.expression.expression.expression.text !== 'globalThis'))
			) {
				continue;
			}

			result =
				expression.expression.expression.expression.text === 'window'
					? windowCustomElements
					: globalThisCustomElements;
		}

		if (!ts.isStringLiteral(expression.arguments[0]!)) {
			continue;
		}

		result.push([expression.arguments[0].text, expression.arguments[1]!]);
	}

	return [
		...customElements,
		...windowCustomElements,
		...globalThisCustomElements,
	];
}

export function findAllDefinedElements(
	program: ts.Program,
): Map<string, ts.Node> {
	const result = new Map<string, ts.Node>();

	for (const [name, node] of program.getSourceFiles().flatMap(source => {
		if (source.isDeclarationFile) {
			return [];
		}

		return findDefinedElements(source);
	})) {
		if (result.has(name)) {
			throw new Error(`Duplicate element definition found for "${name}"`);
		}

		result.set(name, node);
	}

	return result;
}
