import {
	Component,
	ChangeDetectionStrategy,
	ViewEncapsulation,
	ElementRef,
	ChangeDetectorRef,
	Input,
	NgZone,
} from '@angular/core';
import type {TestElement} from '../elements/test.element';

import '../elements/test.element';

@Component({
	standalone: true,
	selector: 'integration-test',
	template: '<ng-content></ng-content>',
	changeDetection: ChangeDetectionStrategy.OnPush,
	encapsulation: ViewEncapsulation.None,
})
export class IntegrationTestComponent {
	private _e: TestElement;

	constructor(
		{nativeElement: _e}: ElementRef<TestElement>,
		private readonly _z: NgZone,
		c: ChangeDetectorRef,
	) {
		this._e = _e;
		c.detach();
	}

	@Input()
	set name(val: TestElement['name']) {
		this._z.runOutsideAngular(() => {
			this._e.name = val;
		});
	}

	get name(): TestElement['name'] {
		return this._e.name;
	}
}
