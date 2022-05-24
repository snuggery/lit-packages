import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
// eslint-disable-next-line import/no-extraneous-dependencies
import {IntegrationLibTestComponent} from '@integration/lib';

import {IntegrationTestComponent} from '../generated-components/integration-test.component';

import {AppComponent} from './app.component';

@NgModule({
	declarations: [AppComponent],
	imports: [
		BrowserModule,
		IntegrationTestComponent,
		IntegrationLibTestComponent,
	],
	providers: [],
	bootstrap: [AppComponent],
})
export class AppModule {}
