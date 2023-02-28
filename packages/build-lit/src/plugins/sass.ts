import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {dirname, extname, join} from 'node:path';
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
					filter: /\.(?:sass|scss|css)$/,
				},
				async ({importer, kind, path, pluginData, ...rest}) => {
					if (pluginData?.litSass) {
						return;
					}

					pluginData = {
						...pluginData,
						litSass:
							kind !== 'entry-point' && /\.[cm]?[tj]sx?$/.test(importer)
								? 'lit'
								: 'css',
					};

					return {
						...(await build.resolve(path, {
							importer,
							kind,
							...rest,
							pluginData,
						})),
						pluginData,
					};
				},
			);

			build.onLoad(
				{filter: /\.(?:sass|scss|css)$/},
				async ({path, pluginData}) => {
					if (!pluginData?.litSass) {
						return null;
					}
					const litSass: 'css' | 'lit' = pluginData.litSass;
					pluginData = {...pluginData};
					delete pluginData.litSass;

					const require = createRequire(path);

					let css: string, watchFiles: string[];

					switch (extname(path)) {
						case '.sass':
						case '.scss':
							{
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
														(e as NodeJS.ErrnoException).code ===
															'MODULE_NOT_FOUND'
													) {
														return null;
													}

													throw e;
												}

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

								css = result.css;
								watchFiles = result.loadedUrls
									.filter(url => url.protocol === 'file:')
									.map(url => fileURLToPath(url));
							}
							break;
						default:
							watchFiles = [path];
							css = await readFile(path, 'utf-8');
					}

					if (litSass === 'css') {
						return {
							loader: 'css',
							contents: css,
							watchFiles,
						};
					}

					return {
						loader: 'js',
						contents: `import {css} from 'lit';\nexport default css\`${css
							.replace(/`/g, '\\x60')
							.replace(/\$\{/g, '\\${')}\`;\n`,
						watchFiles,
					};
				},
			);
		},
	};
}
