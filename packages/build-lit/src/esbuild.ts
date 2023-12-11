import type {BuildFailure} from "esbuild";

let esbuild;

try {
	esbuild = await import("esbuild");
} catch {
	esbuild = await import("esbuild-wasm");
}

export const build = esbuild.build;
export const context = esbuild.context;

export function isBuildFailure(error: unknown): error is BuildFailure;
export function isBuildFailure(e: unknown): e is BuildFailure {
	const error = e as BuildFailure;
	return (
		error instanceof Error &&
		Array.isArray(error.errors) &&
		Array.isArray(error.warnings)
	);
}
