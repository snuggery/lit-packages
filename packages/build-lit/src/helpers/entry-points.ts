import type {BuilderContext} from '@angular-devkit/architect';
import {resolveWorkspacePath} from '@snuggery/architect';
import type {BuildResult} from 'esbuild';
import {JSDOM} from 'jsdom';
import {copyFile, readFile, writeFile} from 'node:fs/promises';
import {dirname, join, relative, resolve} from 'node:path/posix';

import {findCommonPathPrefix} from './longest-common-path-prefix.js';

function areStringEntries(
	entryPoints: string[] | {in: string; out: string}[],
): entryPoints is string[] {
	return typeof entryPoints[0] === 'string';
}

function isNotNull<T>(value: T): value is NonNullable<T> {
	return value != null;
}

export async function extractEntryPoints(
	context: BuilderContext,
	{
		entryPoints,
		outbase,
		outdir,
		watch = false,
		baseHref,
		deployUrl = '/',
		minify = false,
	}: {
		entryPoints:
			| string[]
			| {in: string; out: string}[]
			| {[out: string]: string};
		outbase?: string;
		outdir: string;
		watch?: boolean;
		baseHref?: string;
		deployUrl?: string;
		minify?: boolean;
	},
) {
	if (!Array.isArray(entryPoints)) {
		entryPoints = Object.entries(entryPoints).map(([out, _in]) => ({
			in: _in,
			out,
		}));
	}

	const resultHandlers: (() => Promise<void>)[] = [];

	if (watch) {
		resultHandlers.push(
			(
				outdir => () =>
					writeFile(
						join(outdir, '__esbuild_reload__.js'),
						`new EventSource('/esbuild').addEventListener('change', () => location.reload());\n`,
					)
			)(outdir),
		);
	}

	if (baseHref != null) {
		baseHref = resolve('/', baseHref);
		deployUrl = resolve('/', deployUrl);

		if (baseHref !== deployUrl) {
			const outSubDir = relative(deployUrl, baseHref);

			outdir = join(outdir, outSubDir);
		}
	}

	const base =
		outbase ??
		(areStringEntries(entryPoints)
			? findCommonPathPrefix(entryPoints)
			: findCommonPathPrefix(entryPoints.map(e => e.out)));

	if (areStringEntries(entryPoints)) {
		entryPoints = entryPoints.map(file => ({
			in: file,
			out: relative(base, file).replace(/\.[^.]+$/, ''),
		}));
	}

	const actualEntryPoints: {in: string; out: string}[] = [];
	const htmlEntryPoints: {in: string; out: string}[] = [];

	for (const entryPoint of entryPoints) {
		if (/\.html?$/.test(entryPoint.in)) {
			htmlEntryPoints.push(entryPoint);
		} else {
			actualEntryPoints.push(entryPoint);
		}
	}

	const knownEntryPoints = new Map(
		actualEntryPoints.map(entryPoint => [entryPoint.in, entryPoint.out]),
	);
	const outputHandlers: ((outputs: Map<string, string>) => void)[] = [];

	if (minify) {
		for (const entryPoint of actualEntryPoints) {
			outputHandlers.push(async output => {
				const writtenOutput = output.get(entryPoint.in);
				if (writtenOutput == null) {
					throw new Error(
						`Expected output to be generated for ${entryPoint.in}`,
					);
				}

				const expectedOutput = writtenOutput.replace(/-[^.]+(\.[^.]+)+$/, '$1');
				await copyFile(
					join(outdir, writtenOutput),
					join(outdir, expectedOutput),
				);
			});
		}
	}

	for (const htmlEntryPoint of htmlEntryPoints) {
		const dom = new JSDOM(
			await readFile(resolveWorkspacePath(context, htmlEntryPoint.in)),
		);
		const {document} = dom.window;

		for (const el of document.querySelectorAll('script[src]')) {
			el.setAttribute('type', 'module');
			process(el, 'src');
		}

		for (const el of document.querySelectorAll('img[src]')) {
			process(el, 'src');
		}

		for (const el of document.querySelectorAll('link[href]')) {
			process(el, 'href');
		}

		if (baseHref) {
			const base = document.querySelector('base');
			if (base != null) {
				base.href = join(baseHref, dirname(htmlEntryPoint.out));
			}
		}

		if (watch) {
			const script = document.createElement('script');
			script.type = 'module';
			script.src = join(deployUrl, '__esbuild_reload__.js');
			document.body.appendChild(script);
		}

		resultHandlers.push(() =>
			writeFile(
				join(
					outdir,
					/\.html?$/.test(htmlEntryPoint.out)
						? htmlEntryPoint.out
						: `${htmlEntryPoint.out}.html`,
				),
				dom.serialize(),
			),
		);

		// eslint-disable-next-line no-inner-declarations
		function process(element: Element, attribute: string) {
			const value = element.getAttribute(attribute)!;

			try {
				new URL(value);
				// -> the attribute is a fully qualified URL, no need to process
				return;
			} catch {
				// ignore
			}

			if (value.startsWith('/')) {
				// absolute URL, ignore as well
				return;
			}

			const newEntryIn = join(dirname(htmlEntryPoint.in), value);
			if (!knownEntryPoints.has(newEntryIn)) {
				const newEntryOut = relative(base, newEntryIn).replace(/\.[^.]+$/, '');
				knownEntryPoints.set(newEntryIn, newEntryOut);

				actualEntryPoints.push({in: newEntryIn, out: newEntryOut});
			}

			outputHandlers.push(outputs => {
				const entryOut = outputs.get(newEntryIn);
				if (entryOut == null) {
					throw new Error(`Expected output to be generated for ${newEntryIn}`);
				}

				element.setAttribute(
					attribute,
					relative(dirname(htmlEntryPoint.out), entryOut),
				);
			});
		}
	}

	return {
		entryPoints: actualEntryPoints,
		outdir,
		async processResult(
			result: BuildResult & {metafile: NonNullable<BuildResult['metafile']>},
		) {
			const outputs = new Map(
				Object.entries(result.metafile.outputs)
					.map(([output, {entryPoint, inputs}]) => {
						let input;
						if (entryPoint) {
							input = entryPoint;
						} else {
							const inputPaths = Object.keys(inputs);
							if (inputPaths.length !== 1) {
								return null;
							}
							input = inputPaths[0]!;
						}

						return [
							input,
							relative(outdir, resolveWorkspacePath(context, output)),
						] as const;
					})
					.filter(isNotNull),
			);

			for (const outputHandler of outputHandlers) {
				outputHandler(outputs);
			}

			await Promise.all(resultHandlers.map(handler => handler()));
		},
	};
}
