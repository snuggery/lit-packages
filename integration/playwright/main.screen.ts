import {ComponentHarness} from '@angular/cdk/testing';

export class MainScreen extends ComponentHarness {
	static path = '/';

	static hostSelector = 'app-root';

	translatedText = this.locatorFor('integration-test p:first-child');
	translatedTemplate = this.locatorFor('integration-test p:last-child');
}
