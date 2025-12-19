export default /** @type {import('@ngx-playwright/test').PlaywrightTestConfig} */ ({
	use: {
		browserName: "chromium",
		headless: true,
	},

	testDir: import.meta.dirname,
	testMatch: "*.spec.js",
});
