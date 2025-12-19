import {describe, it, expect, beforeEach, afterEach} from "vitest";

import "./my-app.js";
import type {MyAppElement} from "./my-app.js";

describe("my-app (vitest)", () => {
	let container: HTMLDivElement;

	beforeEach(() => {
		container = document.createElement("div");
		document.body.appendChild(container);
	});

	afterEach(() => {
		container.remove();
	});

	it("should work", async () => {
		const el = document.createElement("my-app") as MyAppElement;
		container.appendChild(el);

		await el.updateComplete;
		const title = el.shadowRoot!.querySelector("h1")!;

		expect(title.innerText).toContain("Help me, Obi");
		expect(getComputedStyle(title).color).toMatch(
			/^(?:#007399|rgb\(0, ?115, ?153\))$/,
		);

		el.name = "Lit";

		await el.updateComplete;

		expect(el.shadowRoot!.innerHTML).toContain("Help me, Lit");
	});
});
