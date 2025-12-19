// cspell:ignore testdir

import {
	createBuilder,
	resolveTargetString,
	targetFromTargetString,
	targetStringFromTarget,
	type BuilderContext,
} from "@snuggery/architect";
import type {JsonObject} from "@snuggery/core";
import type {OutputFile} from "esbuild";
import {mkdtemp, rm, readdir, mkdir, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {dirname, join} from "node:path";
import type {Vitest} from "vitest/node";

import type {Schema as ApplicationSchema} from "../application/schema.js";
import type {Schema as LibrarySchema} from "../library/schema.js";

import {build} from "./build.js";
import {findTests} from "./find-tests.js";
import type {Schema} from "./schema.js";
import {createVitest, isSuccessful as areTestsSuccessful} from "./vitest.js";

async function normalizeInput(context: BuilderContext, input: Schema) {
	if (!input.buildTarget) {
		input.target ??= "es2022";
		return;
	}

	const buildTarget = targetFromTargetString(
		resolveTargetString(context, input.buildTarget),
	);
	const buildBuilder = await context.getBuilderNameForTarget(buildTarget);
	switch (buildBuilder) {
		case "@snuggery/build-lit/dist:application":
		case "@snuggery/build-lit/dist:library":
			// Only required for this repo itself, where the builders are read from the dist folder
			break;
		case "@snuggery/build-lit:application":
		case "@snuggery/build-lit:library":
			break;
		default:
			context.logger.warn(
				`Unexpected builder ${JSON.stringify(buildBuilder)} for build target ${targetStringFromTarget(buildTarget)}`,
			);
	}

	const buildInput: ApplicationSchema | LibrarySchema =
		await context.validateOptions<
			JsonObject & (ApplicationSchema | LibrarySchema)
		>(await context.getTargetOptions(buildTarget), buildBuilder);

	if (buildInput.tsconfig) {
		input.tsconfig ||= buildInput.tsconfig;
	}

	input.target ||= buildInput.target ?? "es2022";

	if (!input.conditions?.length && "conditions" in buildInput) {
		input.conditions = buildInput.conditions;
	}
}

async function writeOutput(
	root: string,
	outputFiles: ReadonlyMap<string, OutputFile>,
) {
	// this could be made smarter by keeping a reference of previously written files and only updating
	// those on disk that need updating

	await Promise.all(
		(await readdir(root)).map((f) => rm(f, {recursive: true, force: true})),
	);

	const mkdirPromises = new Map<string, Promise<unknown>>();

	await Promise.all(
		Array.from(outputFiles, async ([path, file]) => {
			path = join(root, path);

			const directory = dirname(path);
			let mkdirPromise = mkdirPromises.get(directory);
			if (mkdirPromise == null) {
				mkdirPromise = mkdir(directory, {recursive: true});
				mkdirPromises.set(directory, mkdirPromise);
			}

			await mkdirPromise;
			await writeFile(path, file.contents);
		}),
	);
}

export default createBuilder<Schema>(async function* (input, context) {
	await normalizeInput(context, input);

	const tests = await findTests(context, input);

	if (input.listTests) {
		context.logger.info("Found test files:");
		for (const test of tests) {
			context.logger.info(`- ${test}`);
		}

		return;
	}

	const isCi = !!process.env.CI;

	if (isCi) {
		if (input.watch) {
			context.logger.warn("The watch option is ignored in CI environments");
		}
		input.watch = false;

		if (input.ui) {
			context.logger.warn("The ui option is ignored in CI environments");
		}
		input.ui = false;
	} else {
		input.watch ??= !!process.stderr.isTTY;
	}

	let testdir: string | null = null;
	if (input.keepBuiltFiles) {
		testdir = await mkdtemp(join(tmpdir(), "vitest-"));
		context.logger.info(`Tests are compiled into ${testdir}`);
	}

	const entryPointToTestMap = new Map(
		tests.map((file, i) => [`test-${i}`, file]),
	);
	const testToEntryPointMap = new Map(
		Array.from(entryPointToTestMap, ([entryPoint, test]) => [test, entryPoint]),
	);
	const builtFiles = new Map<string, OutputFile>();

	let vitest: Vitest | undefined;

	for await (const currentBuiltFiles of build(
		context,
		input,
		entryPointToTestMap,
	)) {
		if (testdir) {
			await writeOutput(testdir, currentBuiltFiles);
		}

		builtFiles.clear();
		for (const [path, file] of currentBuiltFiles) {
			builtFiles.set(path, file);
		}

		if (!vitest) {
			vitest = await createVitest(
				context,
				input,
				builtFiles,
				testToEntryPointMap,
			);
		} else {
			await vitest.cancelCurrentRun("keyboard-input");

			vitest.rerunTestSpecifications(
				await vitest.getRelevantTestSpecifications(),
			);
		}

		yield {success: areTestsSuccessful(vitest)};
	}
});
