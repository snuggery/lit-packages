/** cspell:ignore quasis */

import {createRequire} from 'node:module';

import {info as sassInfo} from './compile-sass.cjs';

/**
 * @typedef {object} VisitorContext
 * @prop {[moduleSpecifier: string, name: string][]} imports
 */

const contextKey = 'ngxLit_sass';

const sassLoaderPath = createRequire(import.meta.url).resolve(
	'./build-angular/sass-loader.cjs',
);

/**
 * @param {import('@babel/core').ConfigAPI & {
 *   types: import('@babel/types');
 * }} babelApi
 * @returns {import('@babel/core').PluginObj}
 */
export default babelApi => {
	const {types: t} = babelApi;
	babelApi.cache.using(() => sassInfo);

	return {
		visitor: {
			Program: {
				enter() {
					this.set(contextKey, /** @type {VisitorContext} */ ({imports: []}));
				},
				exit(path) {
					const {imports} = /** @type {VisitorContext} */ (
						this.get(contextKey)
					);

					if (imports.length === 0) {
						return;
					}

					/** @type {import('@babel/core').NodePath<import('@babel/types').Statement>} */ (
						path.get('body')[0]
					).insertBefore(
						imports.map(([moduleSpecifier, name]) =>
							t.importDeclaration(
								[t.importDefaultSpecifier(t.identifier(name))],
								t.stringLiteral(moduleSpecifier),
							),
						),
					);
				},
			},
			ImportDeclaration(path) {
				if (path.node.source.value !== '@ngx-lit/sass') {
					return;
				}

				path.remove();
			},
			TaggedTemplateExpression(path) {
				const tag = path.get('tag');
				const template = path.get('quasi');

				if (
					!tag.isIdentifier() ||
					(tag.node.name !== 'sass' && tag.node.name !== 'scss')
				) {
					return;
				}

				const {confident, value} = template.evaluate();
				if (value == null || !confident) {
					return;
				}

				const name = path.scope.generateUid('style');
				const moduleSpecifier = `!!${sassLoaderPath}?type=${
					tag.node.name
				}&location=${Buffer.from(
					/** @type {string} */ (this.filename),
				).toString('hex')}!data:text/plain;base64,${Buffer.from(value).toString(
					'base64url',
				)}`;

				const {imports} = /** @type {VisitorContext} */ (this.get(contextKey));
				imports.push([moduleSpecifier, name]);
				this.set(contextKey, /** @type {VisitorContext} */ ({imports}));

				path.replaceWith(t.identifier(name));
			},
		},
	};
};
