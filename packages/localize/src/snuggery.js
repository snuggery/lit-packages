import {replaceLocalize} from './typescript.js';

export default /** @type {import('@snuggery/angular/compiler').CompilerPluginFactory} */ {
	name: '@ngx-lit/localize',
	create() {
		return {
			typescriptTransformers: {
				before: [replaceLocalize],
			},
		};
	},
};
