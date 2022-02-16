/* cspell:word ngtools */

import type webpack from 'webpack';

/**
 * Install a rule in the webpack configuration to transform `@lit/localize` translations into `$localize` translations.
 *
 * @param config Webpack configuration
 * @returns The webpack configuration
 */
export function installLoader(
	config: webpack.Configuration,
): webpack.Configuration {
	const rules = config.module!.rules!;

	const rule = {
		include: /\.[cm]?[tj]s$/,
		exclude: /\/@angular\//,
		use: {
			// We don't have a dependency on babel-loader, but @angular-devkit/build-angular does.
			// We could add a dependency to babel-loader ourselves, but that's kinda annoying,
			// because then we pull in a peer dependency on webpack that we can't really fill, as
			// the version of webpack that will be used is the one of the angular devkit. Let's
			// cross that bridge if angular ever removes their own dependency on babel-loader.
			loader: 'babel-loader',
			options: {
				babelrc: false,
				plugins: [require.resolve('./babel-plugin.js')],
			},
		},
	};

	// Look for @ngtools/webpack so we can install our plugin to run _after_ that one
	// (which means we have to add it _before_ the ngtools plugin in the list)
	//
	// We can't have our plugin run before @ngtools/webpack, that would lead to our
	// modifications getting lost. We also can't have our plugin run last, because
	// `ng extract-i18n` extracts messages via a plugin so we have to make sure we
	// run before that plugin.
	const index = rules.findIndex(rule => {
		if (typeof rule !== 'object') {
			return false;
		}

		if (rule.loader != null) {
			return /\/@ngtools\/webpack\//.test(rule.loader);
		} else if (Array.isArray(rule.use)) {
			return rule.use.some(
				use =>
					typeof use === 'object' &&
					use.loader &&
					/\/@ngtools\/webpack\//.test(use.loader),
			);
		} else if (
			rule.use != null &&
			typeof rule.use === 'object' &&
			rule.use.loader
		) {
			return /\/@ngtools\/webpack\//.test(rule.use.loader);
		}

		return false;
	});

	if (index === -1) {
		rules.push(rule);
	} else {
		rules.splice(index, 0, rule);
	}

	return config;
}
