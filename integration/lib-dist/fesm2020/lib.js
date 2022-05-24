// integration/lib-dist/esm2020/elements/test.element.js
import { LitElement, html } from "lit";
var localizedHtml = () => {
  const separator = "$_$ngx-lit$_$", translated = ((name) => $localize`:@@lit-lib-html:This is translated template for <b>${name}</b>`)(separator).split(separator), result = Object.freeze(Object.defineProperty(translated, "raw", { value: translated }));
  localizedHtml = () => result;
  return result;
};
var localizedHtml1 = () => {
  const translated = [$localize`:@@lit-lib-html-no-param:This is translated template <em>without parameters</em>`], result = Object.freeze(Object.defineProperty(translated, "raw", { value: translated }));
  localizedHtml1 = () => result;
  return result;
};
var TestElement = class extends LitElement {
  render() {
    return html`
			<p>
				${$localize`:@@lit-lib-text:This is translated text for ${this.name}`}
			</p>
			<p>
				${$localize`:@@lit-lib-text-no-param:This is translated text without parameter`}
			</p>
			<p>
				${html(localizedHtml(), this.name)}
			</p>
			<p>
				${html(localizedHtml1())}
			</p>
		`;
  }
};
TestElement.properties = {
  name: { type: String }
};
customElements.define("integration-lib-test", TestElement);

// integration/lib-dist/esm2020/generated-components/integration-lib-test.component.js
import { Component, ChangeDetectionStrategy, ViewEncapsulation, Input } from "@angular/core";
import * as i0 from "@angular/core";
var IntegrationLibTestComponent = class {
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
};
IntegrationLibTestComponent.\u0275fac = i0.\u0275\u0275ngDeclareFactory({ minVersion: "12.0.0", version: "14.0.0-rc.1", ngImport: i0, type: IntegrationLibTestComponent, deps: [{ token: i0.ElementRef }, { token: i0.NgZone }, { token: i0.ChangeDetectorRef }], target: i0.\u0275\u0275FactoryTarget.Component });
IntegrationLibTestComponent.\u0275cmp = i0.\u0275\u0275ngDeclareComponent({ minVersion: "14.0.0", version: "14.0.0-rc.1", type: IntegrationLibTestComponent, isStandalone: true, selector: "integration-lib-test", inputs: { name: "name" }, ngImport: i0, template: "<ng-content></ng-content>", isInline: true, changeDetection: i0.ChangeDetectionStrategy.OnPush, encapsulation: i0.ViewEncapsulation.None });
i0.\u0275\u0275ngDeclareClassMetadata({ minVersion: "12.0.0", version: "14.0.0-rc.1", ngImport: i0, type: IntegrationLibTestComponent, decorators: [{
  type: Component,
  args: [{
    standalone: true,
    selector: "integration-lib-test",
    template: "<ng-content></ng-content>",
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None
  }]
}], ctorParameters: function() {
  return [{ type: i0.ElementRef }, { type: i0.NgZone }, { type: i0.ChangeDetectorRef }];
}, propDecorators: { name: [{
  type: Input
}] } });
export {
  IntegrationLibTestComponent,
  TestElement
};
//# sourceMappingURL=lib.js.map
