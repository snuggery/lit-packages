import ts from 'typescript';

import {compileSass} from './compile-sass.cjs';

const cssImportAlias = '$ngxLit$sass$css';
const cssImportName = 'css';
const cssImportFrom = 'lit';

/**
 * @type {import('typescript').TransformerFactory<import('typescript').SourceFile>}
 */
export const transformSass = context => sourceFile => {
	let hasCompiledSass = false;

	sourceFile = ts.visitEachChild(
		sourceFile,
		/** @returns {import('typescript').Node} */
		function visitNode(node) {
			if (
				ts.isTaggedTemplateExpression(node) &&
				ts.isIdentifier(node.tag) &&
				/^s[ac]ss$/.test(node.tag.text) &&
				ts.isNoSubstitutionTemplateLiteral(node.template)
			) {
				hasCompiledSass = true;

				const {css} = compileSass(
					sourceFile.fileName,
					node.template.text,
					node.tag.text === 'sass',
				);

				return context.factory.createTaggedTemplateExpression(
					context.factory.createIdentifier(cssImportAlias),
					undefined,
					context.factory.createNoSubstitutionTemplateLiteral(css.toString()),
				);
			}

			return ts.visitEachChild(node, visitNode, context);
		},
		context,
	);

	if (!hasCompiledSass) {
		return sourceFile;
	}

	return context.factory.updateSourceFile(
		sourceFile,
		sourceFile.statements.map(statement => {
			if (
				!ts.isImportDeclaration(statement) ||
				!ts.isStringLiteral(statement.moduleSpecifier) ||
				statement.moduleSpecifier.text !== '@ngx-lit/sass'
			) {
				return statement;
			}

			return context.factory.createImportDeclaration(
				undefined,
				context.factory.createImportClause(
					false,
					undefined,
					context.factory.createNamedImports([
						context.factory.createImportSpecifier(
							false,
							context.factory.createIdentifier(cssImportName),
							context.factory.createIdentifier(cssImportAlias),
						),
					]),
				),
				context.factory.createStringLiteral(cssImportFrom),
			);
		}),
		sourceFile.isDeclarationFile,
		sourceFile.referencedFiles,
		sourceFile.typeReferenceDirectives,
		sourceFile.hasNoDefaultLib,
		sourceFile.libReferenceDirectives,
	);
};
