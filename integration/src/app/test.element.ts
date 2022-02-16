import {msg, str} from '@lit/localize';
import {LitElement, html} from 'lit';

export class TestElement extends LitElement {
	static override properties = {
		name: {type: String},
	};

	declare name: string;

	override render() {
		return html`
			<p>
				${msg(str`This is translated text for ${this.name}`, {id: 'lit-text'})}
			</p>
			<p>
				${msg(html`This is translated template for <b>${this.name}</b>`, {
					id: 'lit-html',
				})}
			</p>
		`;
	}
}

customElements.define('integration-test', TestElement);
