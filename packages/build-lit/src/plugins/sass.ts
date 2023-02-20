import {createRequire} from 'node:module';
import {dirname, join} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {exports} from 'resolve.exports';

function getPackageName(url: string) {
	let idx = url.indexOf('/');
	if (idx !== -1 && url.startsWith('@')) {
		idx = url.indexOf('/', idx + 1);
	}

	return idx === -1 ? url : url.slice(0, idx);
}

export function sassPlugin(): import('esbuild').Plugin {
	return {
		name: '@ngx-lit/build-lit:sass',
		setup(build) {
			let sassPromise: Promise<typeof import('sass')> | undefined = undefined;

			build.onResolve(
				{
					filter: /\.s[ac]ss$/,
				},
				async ({importer}) => {
					const namespace = /\.[cm][tj]sx?$/.test(importer)
						? 'sass-lit'
						: 'sass-style';

					return {namespace};
				},
			);

			build.onLoad({filter: /\.s[ac]ss$/}, async ({path, namespace}) => {
				const require = createRequire(path);

				if (sassPromise == null) {
					sassPromise = import('sass').then(m => m.default ?? m);
				}

				const {compile} = await sassPromise;

				const result = compile(path, {
					importers: [
						{
							findFileUrl(url) {
								if (url.startsWith('.')) {
									return null;
								}

								const packageName = getPackageName(url);
								let packageJsonPath;

								try {
									packageJsonPath = require.resolve(
										`${packageName}/package.json`,
									);
								} catch (e) {
									if (
										!e ||
										(e as NodeJS.ErrnoException).code === 'MODULE_NOT_FOUND'
									) {
										return null;
									}

									throw e;
								}

								build.resolve('', {});

								const packageJson = require(packageJsonPath);
								const deepImport = '.' + url.slice(packageName.length);
								return pathToFileURL(
									join(
										dirname(packageJsonPath),
										(exports(packageJson, deepImport, {
											unsafe: true,
											conditions: ['sass', 'css', 'style'],
										}) ?? [deepImport])[0]!,
									),
								);
							},
						},
					],
				});

				const watchFiles = result.loadedUrls
					.filter(url => url.protocol === 'file:')
					.map(url => fileURLToPath(url));

				if (namespace === 'sass-style') {
					return {
						loader: 'css',
						contents: result.css,
						watchFiles,
					};
				}

				return {
					loader: 'js',
					contents: `import {css} from 'lit';\nexport default css\`${result.css
						.replace(/`/g, '\\x60')
						.replace(/\$\{/g, '\\${')}\`;\n`,
					watchFiles,
				};
			});
		},
	};
}
