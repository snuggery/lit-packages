import {ComponentHarness} from '@angular/cdk/testing';

export class MainScreen extends ComponentHarness {
	static path = '/';

	static hostSelector = 'app-root';

	translatedText = this.locatorFor('integration-test p:nth-child(1)');
	translatedTemplate = this.locatorFor('integration-test p:nth-child(2)');

	translatedLibText = this.locatorFor('integration-lib-test p:nth-child(1)');
	translatedLibTextWithoutParams = this.locatorFor(
		'integration-lib-test p:nth-child(2)',
	);
	translatedLibTemplate = this.locatorFor(
		'integration-lib-test p:nth-child(3)',
	);
	translatedLibTemplateWithoutParams = this.locatorFor(
		'integration-lib-test p:nth-child(4)',
	);
}
