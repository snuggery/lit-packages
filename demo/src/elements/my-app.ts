import {msg, str} from '@lit/localize';
import {html, LitElement} from 'lit';
import {property} from 'lit/decorators.js';

// @ts-expect-error not in the mood for setting up *.png imports in typescript
import img from '../assets/lit.png';

import styles from './my-app.scss';

export class MyAppElement extends LitElement {
	static styles = styles;

	@property()
	declare name: string;

	render() {
		/* cspell:ignore kenobi */
		return html`
			<h1>${msg(str`Help me, ${this.name ?? 'Obi-Wan Kenobi'}`)}</h1>
			<img .src=${img} />
		`;
	}
}

customElements.define('my-app', MyAppElement);
