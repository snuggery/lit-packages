import {msg, str} from '@lit/localize';
import {html, LitElement} from 'lit';

import styles from './my-app.scss';

customElements.define(
	'my-app',
	class extends LitElement {
		static styles = styles;

		declare name: string;

		render() {
			/* cspell:ignore kenobi */
			return html`<h1
				>${msg(str`Help me, ${this.name ?? 'Obi-Wan Kenobi'}`)}</h1
			>`;
		}
	},
);
