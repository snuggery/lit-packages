import {run} from '@snuggery/snuggery/mini';
import {createRequire} from 'node:module';

await run({
	binaryLabel: 'build-lit',
	binaryName: 'build-lit',
	binaryVersion: createRequire(import.meta.url)('./package.json').version,

	basename: ['build-lit.config'],
	targets: new Map([
		['build', '@bgotink/build-lit:browser'],
		['extract-i18n', '@bgotink/build-lit:extract-i18n'],
		['serve', '@bgotink/build-lit:dev-server'],
		['test', '@bgotink/build-lit:karma'],
	]),
});
