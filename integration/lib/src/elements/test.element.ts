/* cspell:word hotpink */

import {msg, str} from '@lit/localize';
import {scss} from '@ngx-lit/sass';
import {LitElement, html} from 'lit';

export class TestElement extends LitElement {
	static override properties = {
		name: {type: String},
	};

	static override styles = scss`
		@import './test.element.scss';
	`;

	declare name: string;

	override render() {
		return html`
			<p>
				${msg(str`This is translated text for ${this.name}`, {
					id: 'lit-lib-text',
				})}
			</p>
			<p>
				${msg(str`This is translated text without parameter`, {
					id: 'lit-lib-text-no-param',
				})}
			</p>
			<p>
				${msg(html`This is translated template for <b>${this.name}</b>`, {
					id: 'lit-lib-html',
				})}
			</p>
			<p>
				${msg(html`This is translated template <em>without parameters</em>`, {
					id: 'lit-lib-html-no-param',
				})}
			</p>
		`;
	}
}

customElements.define('integration-lib-test', TestElement);
