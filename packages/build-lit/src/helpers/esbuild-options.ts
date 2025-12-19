import type {BuildOptions} from "esbuild";

export function forwardEsbuildOptions({
	minify,
	conditions = [],
	tsconfig,
	target,
	banner,
	footer,
	inject,
}: Pick<
	BuildOptions,
	| "minify"
	| "conditions"
	| "tsconfig"
	| "target"
	| "banner"
	| "footer"
	| "inject"
>): Pick<
	BuildOptions,
	| "minify"
	| "conditions"
	| "entryNames"
	| "assetNames"
	| "chunkNames"
	| "tsconfig"
	| "target"
	| "banner"
	| "footer"
	| "inject"
	| "define"
> {
	return {
		...(minify ?
			{
				minify: true,
				conditions: Array.from(new Set([...conditions, "production"])),
				entryNames: "[dir]/[name]-[hash]",
				assetNames: "[dir]/[name]-[hash]",
				chunkNames: "chunks/[name]-[hash]",

				define: {
					SNUGGERY_DEV_MODE: "false",
				},
			}
		:	{
				minify: false,
				conditions: Array.from(new Set([...conditions, "development"])),
				entryNames: "[dir]/[name]",
				assetNames: "[dir]/[name]",
				chunkNames: "chunks/[name]-[hash]",

				define: {
					SNUGGERY_DEV_MODE: "true",
				},
			}),

		tsconfig,

		target,

		banner: banner && cleanBannerOrFooter(banner),
		footer: footer && cleanBannerOrFooter(footer),
		inject,
	};
}

function cleanBannerOrFooter(
	value: NonNullable<BuildOptions["footer"] & BuildOptions["banner"]>,
): typeof value {
	return Object.fromEntries(
		Object.entries(value).filter(([, value]) => value != null),
	);
}
