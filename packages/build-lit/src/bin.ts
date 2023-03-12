import {run} from '@snuggery/snuggery/mini';
import {createRequire} from 'node:module';

await run({
	binaryLabel: 'build-lit',
	binaryName: 'build-lit',
	binaryVersion: createRequire(import.meta.url)('./package.json').version,

	basename: ['build-lit.config'],
	targets: new Map([
		['build', '@ngx-lit/build-lit:browser'],
		['extract-i18n', '@ngx-lit/build-lit:extract-i18n'],
		['serve', '@ngx-lit/build-lit:dev-server'],
		['test', '@ngx-lit/build-lit:karma'],
	]),
});
