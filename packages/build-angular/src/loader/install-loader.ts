/* cspell:word ngtools whatwg */

import {createRequire} from 'module';
import type webpack from 'webpack';

const require = createRequire(import.meta.url);

// We don't have a dependency on babel-loader, but @angular-devkit/build-angular does.
// We could add a dependency to babel-loader ourselves, but that's kinda annoying,
// because then we pull in a peer dependency on webpack that we can't really fill, as
// the version of webpack that will be used is the one of the angular devkit. Let's
// cross that bridge if angular ever removes their own dependency on babel-loader.
const babelLoaderPath = createRequire(
	require.resolve('@angular-devkit/build-angular/package.json'),
).resolve('babel-loader');

function hasPackage(name: string) {
	try {
		require.resolve(name);
		return true;
	} catch {
		return false;
	}
}

export function installLoader(
	config: webpack.Configuration,
): webpack.Configuration {
	const plugins = [
		'@ngx-lit/localize/build-angular',
		'@ngx-lit/sass/build-angular',
	].filter(hasPackage);

	if (plugins.length === 0) {
		return config;
	}

	const rules = config.module!.rules!;

	const rule = {
		include: /\.[cm]?[tj]sx?$/,
		exclude:
			/[\\/](?:@angular|core-js(?:-pure)?|tslib|@babel|@?lit|web-animations-js|web-streams-polyfill|whatwg-url)[\\/]/,
		use: {
			loader: babelLoaderPath,
			options: {
				babelrc: false,
				plugins: plugins.map(p => require.resolve(p)),
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
		rules.unshift(rule);
	} else {
		rules.splice(index, 0, rule);
	}

	return config;
}
