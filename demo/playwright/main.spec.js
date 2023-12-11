import {createTest, expect} from "@ngx-playwright/test";

import {MainScreen} from "./main.screen.js";

const test = createTest(MainScreen);

test("should translate", async ({$: {translatedText}}) => {
	// cspell:disable
	await expect(translatedText.text()).resolves.toBe("Help mij, Obi-Wan Kenobi");
	// cspell:enable
});
