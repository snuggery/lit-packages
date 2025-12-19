describe("lib", () => {
	it("should work", async () => {
		expect((await import("./index.js")).lorem).toBe("ipsum");
	});
});
