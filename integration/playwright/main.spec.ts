import {createTest, expect} from '@ngx-playwright/test';

import {MainScreen} from './main.screen';

const test = createTest(MainScreen);

test('should translate', async ({$: {translatedTemplate, translatedText}}) => {
	// cspell:disable
	await expect(translatedText.text()).resolves.toBe(
		'Dit is een vertaalde tekst voor John Doe',
	);
	await expect(translatedTemplate.text()).resolves.toBe(
		'Dit is een vertaald sjabloon voor John Doe',
	);
	// cspell:enable
});
