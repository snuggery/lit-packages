import { ElementRef, ChangeDetectorRef, NgZone } from '@angular/core';
import type { TestElement } from '../elements/test.element';
import '../elements/test.element';
import * as i0 from "@angular/core";
export declare class IntegrationLibTestComponent {
    private readonly _z;
    private _e;
    constructor({ nativeElement: _e }: ElementRef<TestElement>, _z: NgZone, c: ChangeDetectorRef);
    set name(val: TestElement['name']);
    get name(): TestElement['name'];
    static ɵfac: i0.ɵɵFactoryDeclaration<IntegrationLibTestComponent, never>;
    static ɵcmp: i0.ɵɵComponentDeclaration<IntegrationLibTestComponent, "integration-lib-test", never, { "name": "name"; }, {}, never, ["*"], true>;
}
//# sourceMappingURL=integration-lib-test.component.d.ts.map