import {
	BuildFailureError,
	getProjectPath,
	type BuilderContext,
} from "@snuggery/architect";
import {createRequire} from "node:module";
import path from "node:path";
import type {BrowserBuiltinProvider, BrowserConfigOptions} from "vitest/node";

import type {Schema} from "../schema.js";

export async function getBrowserConfig(
	input: Schema,
	context: BuilderContext,
): Promise<BrowserConfigOptions | undefined> {
	if (!input.browsers?.length) {
		return undefined;
	}

	const require = createRequire((await getProjectPath(context)) + path.sep);

	const browserProviderName = findBrowserProvider(require.resolve);
	if (!browserProviderName) {
		throw new BuildFailureError(
			`The "browsers" option requires either "playwright" or "webdriverio" to be installed within the project.\nPlease install \`@vitest/browser-playwright\` or \`@vitest/browser-webdriverio\`.`,
		);
	}

	const browserProviderModule = require(
		`@vitest/browser-${browserProviderName}`,
	);
	const browserProvider = browserProviderModule[browserProviderName] as
		| typeof import("@vitest/browser-playwright").playwright
		| typeof import("@vitest/browser-preview").preview
		| typeof import("@vitest/browser-webdriverio").webdriverio;

	const viewport = input.browserViewport
		?.split("x")
		.map((l) => parseInt(l, 10));

	const isCi = !!process.env.CI;

	const instances = input.browsers.map((browser) => {
		browser = browser.toLowerCase();
		let headless = browser.endsWith("headless");
		if (headless) {
			browser = browser.slice(0, -8);
		}

		if (isCi) {
			headless = true;
		} else if (browserProviderName === "preview") {
			headless = false;
		}

		return {
			browser: browser as NonNullable<
				BrowserConfigOptions["instances"]
			>[number]["browser"],
			headless,
		};
	});

	return {
		enabled: true,
		provider: browserProvider(),

		ui: !isCi && instances.some((instance) => !instance.headless),
		instances,

		...(viewport &&
			viewport.length === 2 && {
				viewport: {
					width: viewport[0]!,
					height: viewport[1]!,
				},
			}),
	};
}

function findBrowserProvider(
	resolve: NodeJS.RequireResolve,
): BrowserBuiltinProvider | undefined {
	const requiresPreview = !!process.versions.webcontainer;

	// One of these must be installed in the project to use browser testing
	const vitestBuiltinProviders =
		requiresPreview ?
			(["preview"] as const)
		:	(["playwright", "webdriverio", "preview"] as const);

	for (const providerName of vitestBuiltinProviders) {
		try {
			resolve(`@vitest/browser-${providerName}`);

			return providerName;
		} catch {
			// continue to try the next provider
		}
	}

	return undefined;
}
