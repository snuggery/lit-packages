const {compileSass} = require('../compile-sass.cjs');

/**
 * @typedef {object} LoaderOptions
 * @prop {string} location
 * @prop {'sass' | 'scss'} type
 */

/**
 * @this {import('webpack').LoaderContext<LoaderOptions>}
 * @param {string} content
 * @returns {string}
 */
module.exports = function (content) {
	const options = this.getOptions({
		type: 'object',
		properties: {
			location: {type: 'string'},
			type: {
				type: 'string',
				enum: ['sass', 'scss'],
			},
		},
		required: ['location', 'type'],
	});

	const location = Buffer.from(options.location, 'hex').toString();

	const {
		css,
		stats: {includedFiles},
	} = compileSass(location, content, options.type === 'sass');

	for (const file of includedFiles) {
		if (file !== location) {
			this.addDependency(file);
		}
	}

	return `import {unsafeCSS} from 'lit';\nexport default unsafeCSS(${JSON.stringify(
		css.toString(),
	)});`;
};
