import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';

import {IntegrationTestComponent} from '../generated-components/integration-test.component';

import {AppComponent} from './app.component';

@NgModule({
	declarations: [AppComponent, IntegrationTestComponent],
	imports: [BrowserModule],
	providers: [],
	bootstrap: [AppComponent],
})
export class AppModule {}
