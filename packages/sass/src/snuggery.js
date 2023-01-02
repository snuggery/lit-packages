import {transformSass} from './typescript.js';

export default /** @type {import('@snuggery/angular/compiler').CompilerPluginFactory} */ ({
	name: '@ngx-lit/sass/snuggery',
	create() {
		return {
			typescriptTransformers: {
				before: [transformSass],
			},
		};
	},
});
