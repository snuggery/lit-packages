import {run} from '@snuggery/snuggery/mini';
import {createRequire} from 'node:module';

await run({
	binaryLabel: 'build-lit',
	binaryName: 'build-lit',
	binaryVersion: createRequire(import.meta.url)('./package.json').version,

	basename: ['build-lit.config'],
	targets: new Map([
		['build', '@snuggery/build-lit:browser'],
		['extract-i18n', '@snuggery/build-lit:extract-i18n'],
		['serve', '@snuggery/build-lit:dev-server'],
		['test', '@snuggery/build-lit:karma'],
	]),
});
