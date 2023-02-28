import type {BuildOptions} from 'esbuild';

export function forwardEsbuildOptions({
	minify,
	tsconfig,
	target,
	banner,
	footer,
	inject,
}: Pick<
	BuildOptions,
	'minify' | 'tsconfig' | 'target' | 'banner' | 'footer' | 'inject'
>): Pick<
	BuildOptions,
	| 'minify'
	| 'conditions'
	| 'entryNames'
	| 'assetNames'
	| 'chunkNames'
	| 'tsconfig'
	| 'target'
	| 'banner'
	| 'footer'
	| 'inject'
> {
	return {
		...(minify
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
			  }),

		tsconfig,

		target,

		banner: banner && cleanBannerOrFooter(banner),
		footer: footer && cleanBannerOrFooter(footer),
		inject,
	};
}

function cleanBannerOrFooter(
	value: NonNullable<BuildOptions['footer'] & BuildOptions['banner']>,
): typeof value {
	return Object.fromEntries(
		Object.entries(value).filter(([, value]) => value != null),
	);
}
