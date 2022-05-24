import ts from 'typescript';

/**
 *
 * @param {ts.NodeFactory} factory
 * @param {ts.Expression} node
 * @returns {ts.Expression}
 */
export function freeze(factory, node) {
	return factory.createCallExpression(
		factory.createPropertyAccessExpression(
			factory.createIdentifier('Object'),
			factory.createIdentifier('freeze'),
		),
		undefined,
		[node],
	);
}

/**
 * @param {ts.NodeFactory} factory
 * @param {string} variable
 */
function createTemplateStringsArray(factory, variable) {
	return factory.createAsExpression(
		freeze(
			factory,
			factory.createCallExpression(
				factory.createPropertyAccessExpression(
					factory.createIdentifier('Object'),
					factory.createIdentifier('defineProperty'),
				),
				undefined,
				[
					factory.createIdentifier(variable),
					factory.createStringLiteral('raw'),
					factory.createObjectLiteralExpression([
						factory.createPropertyAssignment(
							factory.createIdentifier('value'),
							factory.createIdentifier(variable),
						),
					]),
				],
			),
		),
		factory.createTypeReferenceNode(
			factory.createIdentifier('TemplateStringsArray'),
			undefined,
		),
	);
}

/**
 * @param {ts.Expression?=} node
 * @returns {string?}
 */
function tryExtractIdFromObjectLiteral(node) {
	if (node == null || !ts.isObjectLiteralExpression(node)) {
		return null;
	}

	const idProperty = /** @type {ts.PropertyAssignment=} */ (
		node.properties.find(
			prop =>
				ts.isPropertyAssignment(prop) &&
				(ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name)) &&
				prop.name.text === 'id',
		)
	);

	if (idProperty == null || !ts.isStringLiteral(idProperty.initializer)) {
		return null;
	}

	return idProperty.initializer.text;
}

/**
 * @template {ts.TemplateLiteral} T
 * @param {ts.NodeFactory} factory
 * @param {T} node
 * @param {string?} id
 * @returns {T}
 */
function addLocalizeIdToTemplate(factory, node, id) {
	if (id == null) {
		return node;
	}

	if (ts.isTemplateExpression(node)) {
		return /** @type {T} */ (
			factory.updateTemplateExpression(
				node,
				factory.createTemplateHead(
					`:@@${id}:${node.head.text}`,
					node.head.rawText ? `:@@${id}:${node.head.rawText}` : undefined,
				),
				node.templateSpans,
			)
		);
	} else {
		return /** @type {T} */ (
			factory.createNoSubstitutionTemplateLiteral(
				`:@@${id}:${node.text}`,
				node.rawText ? `:@@${id}:${node.rawText}` : undefined,
			)
		);
	}
}

/**
 * @param {ts.NodeFactory} factory
 * @param {ts.TemplateLiteral} template
 * @param {ts.Expression?=} info
 * @returns {ts.TemplateLiteral}
 */
export function transformTemplate(factory, template, info) {
	return addLocalizeIdToTemplate(
		factory,
		template,
		tryExtractIdFromObjectLiteral(info),
	);
}

/**
 *
 * @param {ts.NodeFactory} factory
 * @param {ts.Identifier} name
 * @param {ts.TemplateLiteral} template
 * @param {ts.Expression?=} info
 * @returns {ts.ArrowFunction}
 */
export function createTemplateFactoryFunction(factory, name, template, info) {
	/** @type {ts.Statement[]} */
	const createResult = [];

	if (ts.isNoSubstitutionTemplateLiteral(template)) {
		createResult.push(
			factory.createVariableStatement(
				undefined,
				factory.createVariableDeclarationList(
					[
						factory.createVariableDeclaration(
							factory.createIdentifier('translated'),
							undefined,
							undefined,
							factory.createArrayLiteralExpression([
								factory.createTaggedTemplateExpression(
									factory.createIdentifier('$localize'),
									undefined,
									transformTemplate(factory, template, info),
								),
							]),
						),

						factory.createVariableDeclaration(
							factory.createIdentifier('result'),
							undefined,
							undefined,
							createTemplateStringsArray(factory, 'translated'),
						),
					],
					ts.NodeFlags.Const,
				),
			),
		);
	} else {
		/** @type {Set<string>} */
		const usedParameterNames = new Set();
		/** @param {string} name */
		let findUniqueName = name => {
			if (!usedParameterNames.has(name)) {
				usedParameterNames.add(name);
				return name;
			}

			let idx = 1;
			while (usedParameterNames.has(`${name}${idx}`)) {
				idx++;
			}

			usedParameterNames.add(`${name}${idx}`);
			return `${name}${idx}`;
		};
		const parameters = template.templateSpans.map(span =>
			findUniqueName(
				ts.isIdentifier(span.expression)
					? span.expression.text
					: ts.isPropertyAccessExpression(span.expression) &&
					  ts.isIdentifier(span.expression.name) &&
					  span.expression.expression.kind === ts.SyntaxKind.ThisKeyword
					? span.expression.name.text
					: 'p',
			),
		);

		createResult.push(
			factory.createVariableStatement(
				undefined,
				factory.createVariableDeclarationList(
					[
						factory.createVariableDeclaration(
							factory.createIdentifier('separator'),
							undefined,
							undefined,
							factory.createStringLiteral('$_$ngx-lit$_$'),
						),

						factory.createVariableDeclaration(
							factory.createIdentifier('translated'),
							undefined,
							undefined,
							factory.createCallExpression(
								factory.createPropertyAccessExpression(
									factory.createCallExpression(
										factory.createArrowFunction(
											undefined,
											undefined,
											parameters.map(param =>
												factory.createParameterDeclaration(
													undefined,
													undefined,
													undefined,
													factory.createIdentifier(param),
													undefined,
													factory.createKeywordTypeNode(
														ts.SyntaxKind.StringKeyword,
													),
													undefined,
												),
											),
											undefined,
											factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
											factory.createTaggedTemplateExpression(
												factory.createIdentifier('$localize'),
												undefined,
												transformTemplate(
													factory,
													factory.updateTemplateExpression(
														template,
														template.head,
														template.templateSpans.map((span, i) =>
															factory.updateTemplateSpan(
																span,
																factory.createIdentifier(
																	/** @type {string} */ (parameters[i]),
																),
																span.literal,
															),
														),
													),
													info,
												),
											),
										),
										undefined,
										parameters.map(() => factory.createIdentifier('separator')),
									),
									factory.createIdentifier('split'),
								),
								undefined,
								[factory.createIdentifier('separator')],
							),
						),

						factory.createVariableDeclaration(
							factory.createIdentifier('result'),
							undefined,
							undefined,
							createTemplateStringsArray(factory, 'translated'),
						),
					],
					ts.NodeFlags.Const,
				),
			),
		);
	}

	return factory.createArrowFunction(
		undefined,
		undefined,
		[],
		undefined,
		factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
		factory.createBlock(
			[
				...createResult,

				factory.createExpressionStatement(
					factory.createBinaryExpression(
						factory.createIdentifier(name.text),
						factory.createToken(ts.SyntaxKind.EqualsToken),
						factory.createArrowFunction(
							undefined,
							undefined,
							[],
							undefined,
							factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
							factory.createIdentifier('result'),
						),
					),
				),
				factory.createReturnStatement(factory.createIdentifier('result')),
			],
			true,
		),
	);
}
