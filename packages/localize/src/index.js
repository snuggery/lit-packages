import ts from 'typescript';

import {createTemplateFactoryFunction, transformTemplate} from './utils.js';

/** @type {ts.TransformerFactory<ts.SourceFile>} */
const replaceLocalize = context => sourceFile => {
	let hasImport = false;
	/** @type {string | null} */
	let namespace = null;

	let msgName = 'msg';
	let strName = 'str';

	// Remove imports to @lit/localize
	sourceFile = ts.visitEachChild(
		sourceFile,
		node => {
			if (!ts.isImportDeclaration(node)) {
				return node;
			}

			if (
				!ts.isStringLiteral(node.moduleSpecifier) ||
				node.moduleSpecifier.text !== '@lit/localize' ||
				!node.importClause ||
				node.importClause.isTypeOnly ||
				!node.importClause.namedBindings
			) {
				return node;
			}

			hasImport = true;

			if (ts.isNamespaceImport(node.importClause.namedBindings)) {
				namespace = node.importClause.namedBindings.name.text;
				return node;
			}

			/** @type {ts.ImportSpecifier[]} */
			const importsToKeep = [];

			for (const specifier of node.importClause.namedBindings.elements) {
				const exportName = (specifier.propertyName ?? specifier.name).text;
				const importName = specifier.name.text;
				if (exportName === 'str') {
					strName = importName;
				} else if (exportName === 'msg') {
					msgName = importName;
				} else {
					importsToKeep.push(specifier);
				}
			}

			if (node.importClause.name != null || importsToKeep.length === 0) {
				return undefined;
			}

			return context.factory.updateImportDeclaration(
				node,
				node.decorators,
				node.modifiers,
				context.factory.updateImportClause(
					node.importClause,
					false,
					node.importClause.name,
					context.factory.updateNamedImports(
						node.importClause.namedBindings,
						importsToKeep,
					),
				),
				node.moduleSpecifier,
				node.assertClause,
			);
		},
		context,
	);

	if (!hasImport) {
		return sourceFile;
	}

	/** @type {(node: ts.LeftHandSideExpression, name: string) => boolean} */
	const isLocalizeImport = namespace
		? (node, name) =>
				ts.isPropertyAccessExpression(node) &&
				ts.isIdentifier(node.expression) &&
				node.expression.text === namespace &&
				ts.isIdentifier(node.name) &&
				node.name.text === name
		: (node, name) => ts.isIdentifier(node) && node.text === name;

	const _fnName = context.factory.createUniqueName(
		'localizedHtml',
		ts.GeneratedIdentifierFlags.Optimistic |
			ts.GeneratedIdentifierFlags.FileLevel,
	);

	let generatedFunctions = 0;

	/** @type {ts.Statement[] | null} */
	let extraNodes = null;
	return ts.visitEachChild(
		sourceFile,
		/** @returns {ts.Node | ts.Node[]} */ function visitNode(node) {
			/** @type {(node: ts.Node) => ts.Node | ts.Node[]} */
			let insertNodes = node => node;
			if (extraNodes == null) {
				/** @type {ts.Statement[]} */
				const nodesToInsert = (extraNodes = []);
				insertNodes = node => {
					extraNodes = null;
					return [...nodesToInsert, node];
				};
			}

			if (
				!ts.isCallExpression(node) ||
				!isLocalizeImport(node.expression, msgName)
			) {
				return insertNodes(ts.visitEachChild(node, visitNode, context));
			}

			const [message, info] = node.arguments;

			if (message == null || !ts.isTaggedTemplateExpression(message)) {
				return insertNodes(ts.visitEachChild(node, visitNode, context));
			}

			if (isLocalizeImport(message.tag, strName)) {
				return context.factory.createTaggedTemplateExpression(
					context.factory.createIdentifier('$localize'),
					undefined,
					transformTemplate(context.factory, message.template, info),
				);
			} else {
				const {factory} = context;
				const fnName =
					generatedFunctions === 0
						? _fnName
						: factory.createIdentifier(`${_fnName.text}${generatedFunctions}`);
				generatedFunctions++;

				extraNodes.push(
					factory.createVariableStatement(
						undefined,
						factory.createVariableDeclarationList(
							[
								factory.createVariableDeclaration(
									factory.createIdentifier(fnName.text),
									undefined,
									undefined,
									createTemplateFactoryFunction(
										factory,
										fnName,
										message.template,
										info,
									),
								),
							],
							ts.NodeFlags.Let,
						),
					),
				);

				return factory.createCallExpression(message.tag, undefined, [
					factory.createCallExpression(
						factory.createIdentifier(fnName.text),
						undefined,
						[],
					),
					...(ts.isNoSubstitutionTemplateLiteral(message.template)
						? []
						: message.template.templateSpans.map(span => span.expression)),
				]);
			}
		},
		context,
	);
};

export default /** @type {import('@snuggery/angular/compiler').CompilerPluginFactory} */ ({
	name: '@ngx-lit/localize',
	create() {
		return {
			typescriptTransformers: {
				before: [replaceLocalize],
			},
		};
	},
});
