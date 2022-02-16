const {join} = require('path');

/**
 * @type {import('@ngx-playwright/test').PlaywrightTestConfig}
 */
module.exports = {
	use: {
		channel: 'chrome',
		headless: true,
	},

	testDir: join(__dirname, 'playwright'),
	testMatch: '*.spec.ts',
};
