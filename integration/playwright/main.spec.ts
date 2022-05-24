import {createTest, expect} from '@ngx-playwright/test';

import {MainScreen} from './main.screen.js';

const test = createTest(MainScreen);

test('should translate', async ({
	$: {
		translatedTemplate,
		translatedText,
		translatedLibTemplate,
		translatedLibTemplateWithoutParams,
		translatedLibText,
		translatedLibTextWithoutParams,
	},
}) => {
	// cspell:disable
	await expect(translatedText.text()).resolves.toBe(
		'Dit is een vertaalde tekst voor John Doe',
	);
	await expect(translatedTemplate.text()).resolves.toBe(
		'Dit is een vertaald sjabloon voor John Doe',
	);

	await expect(translatedLibText.text()).resolves.toBe(
		'Dit is een vertaalde tekst voor John Doe',
	);
	await expect(translatedLibTextWithoutParams.text()).resolves.toBe(
		'Dit is een vertaalde tekst zonder parameters',
	);
	await expect(translatedLibTemplate.text()).resolves.toBe(
		'Dit is een vertaald sjabloon voor John Doe',
	);
	await expect(translatedLibTemplateWithoutParams.text()).resolves.toBe(
		'Dit is een vertaald sjabloon zonder parameters',
	);
	// cspell:enable
});
