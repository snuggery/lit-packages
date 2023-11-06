/**
 * Plugin that marks all imported packages as external
 */
export function externalPlugin(): import('esbuild').Plugin {
	return {
		name: '@snuggery/build-lit:external',
		setup(build) {
			build.onResolve(
				{
					filter: /^[@a-zA-Z]/,
				},
				() => ({external: true}),
			);
		},
	};
}
