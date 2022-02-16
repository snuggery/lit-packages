import {Component} from '@angular/core';

import './test.element';

@Component({
	selector: 'app-root',
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.css'],
})
export class AppComponent {
	name = 'John Doe';
}
