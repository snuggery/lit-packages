import { LitElement, html } from 'lit';
let localizedHtml = () => {
    const separator = "$_$ngx-lit$_$", translated = (name => $localize `:@@lit-lib-html:This is translated template for <b>${name}</b>`)(separator).split(separator), result = Object.freeze(Object.defineProperty(translated, "raw", { value: translated }));
    localizedHtml = () => result;
    return result;
};
let localizedHtml1 = () => {
    const translated = [$localize `:@@lit-lib-html-no-param:This is translated template <em>without parameters</em>`], result = Object.freeze(Object.defineProperty(translated, "raw", { value: translated }));
    localizedHtml1 = () => result;
    return result;
};
export class TestElement extends LitElement {
    render() {
        return html `
			<p>
				${$localize `:@@lit-lib-text:This is translated text for ${this.name}`}
			</p>
			<p>
				${$localize `:@@lit-lib-text-no-param:This is translated text without parameter`}
			</p>
			<p>
				${html(localizedHtml(), this.name)}
			</p>
			<p>
				${html(localizedHtml1())}
			</p>
		`;
    }
}
TestElement.properties = {
    name: { type: String },
};
customElements.define('integration-lib-test', TestElement);
//# sourceMappingURL=test.element.js.map