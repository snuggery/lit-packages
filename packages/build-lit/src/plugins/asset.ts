import {readFile} from 'node:fs/promises';

const assetRe = /\.(?:png|jpe?g|gif|ico|svg|avif|mp4|web[pm]|woff2?)$/;

export function assetPlugin(): import('esbuild').Plugin {
	return {
		name: '@ngx-lit/build-lit:asset',
		setup(build) {
			build.onResolve(
				{
					filter: assetRe,
				},
				async ({importer, kind}) => {
					const namespace =
						kind !== 'entry-point' && /\.[cm][tj]sx?$/.test(importer)
							? 'asset-lit'
							: 'asset';

					return {namespace};
				},
			);

			build.onLoad({filter: assetRe}, async ({path, namespace}) => {
				return {
					loader: namespace === 'asset' ? 'copy' : 'file',
					contents: await readFile(path),
				};
			});
		},
	};
}
