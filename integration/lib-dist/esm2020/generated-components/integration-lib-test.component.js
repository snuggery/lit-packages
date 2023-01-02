import { Component, ChangeDetectionStrategy, ViewEncapsulation, Input, } from '@angular/core';
import '../elements/test.element';
import * as i0 from "@angular/core";
export class IntegrationLibTestComponent {
    constructor({ nativeElement: _e }, _z, c) {
        this._z = _z;
        this._e = _e;
        c.detach();
    }
    set name(val) {
        this._z.runOutsideAngular(() => {
            this._e.name = val;
        });
    }
    get name() {
        return this._e.name;
    }
}
IntegrationLibTestComponent.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "15.0.4", ngImport: i0, type: IntegrationLibTestComponent, deps: [{ token: i0.ElementRef }, { token: i0.NgZone }, { token: i0.ChangeDetectorRef }], target: i0.ɵɵFactoryTarget.Component });
IntegrationLibTestComponent.ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "14.0.0", version: "15.0.4", type: IntegrationLibTestComponent, isStandalone: true, selector: "integration-lib-test", inputs: { name: "name" }, ngImport: i0, template: '<ng-content></ng-content>', isInline: true, changeDetection: i0.ChangeDetectionStrategy.OnPush, encapsulation: i0.ViewEncapsulation.None });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "15.0.4", ngImport: i0, type: IntegrationLibTestComponent, decorators: [{
            type: Component,
            args: [{
                    standalone: true,
                    selector: 'integration-lib-test',
                    template: '<ng-content></ng-content>',
                    changeDetection: ChangeDetectionStrategy.OnPush,
                    encapsulation: ViewEncapsulation.None,
                }]
        }], ctorParameters: function () { return [{ type: i0.ElementRef }, { type: i0.NgZone }, { type: i0.ChangeDetectorRef }]; }, propDecorators: { name: [{
                type: Input
            }] } });
//# sourceMappingURL=integration-lib-test.component.js.map