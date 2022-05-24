import {dirname} from 'path';
import {fileURLToPath} from 'url';

export default {
	use: {
		channel: 'chrome',
		headless: true,
	},

	testDir: dirname(fileURLToPath(import.meta.url)),
	testMatch: '*.spec.ts',
} as import('@ngx-playwright/test').PlaywrightTestConfig;
