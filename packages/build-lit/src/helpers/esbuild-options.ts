import type {BuildOptions} from 'esbuild';

export function minifyOptions(
	minify?: boolean,
): Pick<
	BuildOptions,
	'minify' | 'entryNames' | 'assetNames' | 'chunkNames' | 'conditions'
> {
	return minify
		? {
				minify: true,
				entryNames: '[dir]/[name]-[hash]',
				assetNames: '[dir]/[name]-[hash]',
				chunkNames: 'chunks/[name]-[hash]',
		  }
		: {
				minify: false,
				conditions: ['development'],
				entryNames: '[dir]/[name]',
				assetNames: '[dir]/[name]',
				chunkNames: 'chunks/[name]',
		  };
}

export function cleanBannerOrFooter({css, js}: {css?: string; js?: string}): {
	css?: string;
	js?: string;
} {
	if (js != null) {
		if (css != null) {
			return {js, css};
		} else {
			return {js};
		}
	} else {
		if (css != null) {
			return {css};
		} else {
			return {};
		}
	}
}
