import {
	relativeWorkspacePath,
	resolveProjectPath,
	resolveWorkspacePath,
	type BuilderContext,
} from "@snuggery/architect";

import {getFiles} from "../../helpers/typescript.js";

import type {Schema} from "./schema.js";

export async function findTests(
	context: BuilderContext,
	input: Schema,
): Promise<string[]> {
	if (input.include?.length) {
		return await findTestsByGlob(context, input.include, input.exclude);
	} else if (input.tsconfig) {
		let files = await getFiles(context, {
			tsconfig: input.tsconfig,
		});

		if (input.exclude) {
			const {Minimatch} = await import("minimatch");
			const exclude = expandExclude(input.exclude).map(
				(exclude) => new Minimatch(exclude),
			);

			files = files
				.map((file) => relativeWorkspacePath(context, file))
				.filter((file) => exclude.every((e) => !e.match(file)))
				.map((file) => resolveWorkspacePath(context, file));
		}

		return files;
	} else {
		return await findTestsByGlob(
			context,
			await resolveProjectPath(context, "**/*.{spec,test}.ts"),
			["node_modules", ...(input.exclude ?? [])],
		);
	}
}

async function findTestsByGlob(
	context: BuilderContext,
	include: string | string[],
	exclude?: string[],
) {
	const {glob} = await import("glob");

	return await glob(include, {
		absolute: true,

		posix: true,

		cwd: context.workspaceRoot,
		ignore: exclude?.length ? expandExclude(exclude) : undefined,
	});
}

function expandExclude(exclude: string[]) {
	// glob and minimatch take exclusions literally, i.e.
	// "node_modules" only excludes the "node_modules" itself but not any file or folder inside "node_modules"
	return exclude.concat(exclude.map((file) => `${file}/**`));
}
