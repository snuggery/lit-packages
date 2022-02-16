/* cspell:word quasis */

import {type PluginObj, template} from '@babel/core';
import type {Expression, TemplateElement} from '@babel/types';

module.exports = ({
	types: t,
}: {
	types: typeof import('@babel/types');
}): PluginObj => {
	return {
		visitor: {
			ImportDeclaration(path) {
				if (path.node.source.value !== '@lit/localize') {
					return;
				}

				const specifiers = path.node.specifiers.filter(specifier => {
					if (specifier.type !== 'ImportSpecifier') {
						return true;
					}

					const name =
						specifier.imported.type === 'Identifier'
							? specifier.imported.name
							: specifier.imported.value;

					return name !== 'msg' && name !== 'str';
				});

				if (specifiers.length === 0) {
					path.remove();
				} else if (specifiers.length !== path.node.specifiers.length) {
					path.replaceWith(t.importDeclaration(specifiers, path.node.source));
				}
			},

			CallExpression(path) {
				if (
					path.node.callee.type !== 'Identifier' ||
					path.node.callee.name !== 'msg'
				) {
					return;
				}

				const [message, info] = path.get('arguments');

				if (
					message == null ||
					message.node.type !== 'TaggedTemplateExpression' ||
					message.node.tag.type !== 'Identifier'
				) {
					return;
				}

				const {
					tag,
					quasi: {quasis, expressions},
				} = message.node;

				let transformQuasis = (quasis: TemplateElement[]) => quasis;

				if (info?.type === 'ObjectExpression') {
					const {confident, value} = info.evaluate();
					if (
						confident &&
						typeof value === 'object' &&
						value != null &&
						typeof value.id === 'string'
					) {
						const {id} = value;

						transformQuasis = ([first, ...quasis]) => {
							return [
								t.templateElement(
									{
										raw: `:@@${id}:${first!.value.raw}`,
										cooked:
											first!.value.cooked != null
												? `:${id}:${first!.value.cooked}`
												: undefined,
									},
									first!.tail,
								),
								...quasis,
							];
						};
					}
				}

				if (tag.name === 'str') {
					path.replaceWith(
						t.taggedTemplateExpression(
							t.identifier('$localize'),
							t.templateLiteral(transformQuasis(quasis), expressions),
						),
					);
				} else if (tag.name === 'html') {
					const tmp = path.scope.generateUidIdentifier('localizedHtml');
					path.scope.getProgramParent().push({
						id: t.cloneNode(tmp),
						kind: 'let',
						init: template.expression.ast`() => {
                const result = ((s, v = '$_$ngx-lit$_$') => (s = ${t.callExpression(
									t.identifier('s'),
									expressions.map(() => t.identifier('v')),
								)}.split(v), Object.freeze(
                    s.raw = s
                  )))(${t.arrowFunctionExpression(
										expressions.map((_, i) => t.identifier(`p${i}`)),
										t.taggedTemplateExpression(
											t.identifier('$localize'),
											t.templateLiteral(
												transformQuasis(quasis),
												expressions.map((_, i) => t.identifier(`p${i}`)),
											),
										),
									)});

                ${t.cloneNode(tmp)} = () => result;
                return result;
              }`,
					});

					path.replaceWith(
						t.callExpression(tag, [
							t.callExpression(t.cloneNode(tmp), []),
							...(expressions as Expression[]),
						]),
					);
				} else {
					path.replaceWith(message);
				}
			},
		},
	};
};
