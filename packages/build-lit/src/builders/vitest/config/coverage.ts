import {resolveProjectPath, type BuilderContext} from "@snuggery/architect";
import type {CoverageOptions} from "vitest/node";

import type {Schema} from "../schema.js";

export async function generateCoverageConfig(
	input: Schema,
	context: BuilderContext,
	existingOptions?: CoverageOptions,
): Promise<CoverageOptions | undefined> {
	if (input.coverage === false) {
		return existingOptions;
	}

	if (existingOptions?.provider === "custom") {
		context.logger.warn(
			"Custom coverage providers must be configured entirely in the vitest config file, set `coverage` to false in the configuration for `@snuggery/build-lit:vitest`",
		);
		return existingOptions;
	}

	let defaultExcludes: string[] = [];
	if (input.coverageExclude?.length) {
		try {
			const vitestConfig = await import("vitest/config");
			defaultExcludes = vitestConfig.coverageConfigDefaults?.exclude || [];
		} catch {
			// Defaults unavailable, keep empty
		}
	}

	const watermarks = {...input.coverageWatermarks};
	for (const key of Object.keys(watermarks) as Array<keyof typeof watermarks>) {
		if (!Array.isArray(watermarks[key]) || watermarks[key].length !== 2) {
			delete watermarks[key];
		}
	}

	return {
		enabled: true,

		reportsDirectory:
			existingOptions?.reportsDirectory ??
			(await resolveProjectPath(context, "coverage")),
		provider: existingOptions?.provider || "v8",
		...(input.coverageInclude?.length ? {include: input.coverageInclude} : {}),
		...(input.coverageExclude?.length ?
			{
				exclude: [...input.coverageExclude, ...defaultExcludes],
				// apply excludes after remapping the .js files via sourcemap back to their source files
				excludeAfterRemap: true,
			}
		:	{}),

		thresholds: input.coverageThresholds,
		watermarks,
		...(input.coverageReporters?.length ?
			{reporter: input.coverageReporters}
		:	{}),
	};
}
