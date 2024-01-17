import {ComponentHarness} from "@angular/cdk/testing";

export class MainScreen extends ComponentHarness {
	static path = "";

	static hostSelector = "my-app";

	translatedText = this.locatorFor("#translated");
}

export class AlternativelyRoutedMainScreen extends MainScreen {
	static path = "/path/that/does/not/exist";
}
