import {createTest, expect} from "@ngx-playwright/test";

import {MainScreen, AlternativelyRoutedMainScreen} from "./main.screen.js";

const test = createTest(MainScreen);

test("should translate", async ({$: {translatedText}}) => {
	// cspell:disable
	await expect(translatedText.text()).resolves.toBe("Help mij, Obi-Wan Kenobi");
	// cspell:enable
});

const testOtherRoute = createTest(AlternativelyRoutedMainScreen);

testOtherRoute(
	"should fallback 404 to index.html to support single page apps",
	async ({page, $: {translatedText}}) => {
		expect(page.url()).toMatch(/\/path\/that\/does\/not\/exist$/);

		// cspell:disable
		await expect(translatedText.text()).resolves.toBe(
			"Help mij, Obi-Wan Kenobi",
		);
		// cspell:enable
	},
);
