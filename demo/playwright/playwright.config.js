import {dirname} from "node:path";
import {fileURLToPath} from "node:url";

export default /** @type {import('@ngx-playwright/test').PlaywrightTestConfig} */ ({
	use: {
		browserName: "chromium",
		headless: true,
	},

	testDir: dirname(fileURLToPath(import.meta.url)),
	testMatch: "*.spec.js",
});
