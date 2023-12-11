import "./my-app.js";
import type {MyAppElement} from "./my-app.js";

describe("my-app", () => {
	it("should work", async () => {
		const el = document.createElement("my-app") as MyAppElement;
		document.body.appendChild(el);

		await el.updateComplete;

		expect(el.shadowRoot!.innerHTML).toContain("Help me, Obi");

		el.name = "Lit";

		await el.updateComplete;

		expect(el.shadowRoot!.innerHTML).toContain("Help me, Lit");

		el.remove();
	});
});
