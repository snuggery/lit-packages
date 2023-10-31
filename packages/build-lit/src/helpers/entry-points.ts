import {type BuilderContext, resolveWorkspacePath} from '@snuggery/architect';
import type {BuildResult} from 'esbuild';
import {copyFile, readFile, writeFile} from 'node:fs/promises';
import {dirname, join, relative, resolve} from 'node:path/posix';
import {
	serialize,
	parse,
	parseFragment,
	type DefaultTreeAdapterMap,
} from 'parse5';

import {findCommonPathPrefix} from './longest-common-path-prefix.js';

function areStringEntries(
	entryPoints: string[] | {in: string; out: string}[],
): entryPoints is string[] {
	return typeof entryPoints[0] === 'string';
}

function isNotNull<T>(value: T): value is NonNullable<T> {
	return value != null;
}

function isElement(
	node: DefaultTreeAdapterMap['childNode'],
): node is DefaultTreeAdapterMap['element'] {
	return !node.nodeName.startsWith('#');
}

export async function extractEntryPoints(
	context: BuilderContext,
	{
		entryPoints,
		outbase,
		outdir,
		watch = false,
		liveReload = false,
		baseHref,
		deployUrl = '/',
		minify = false,
		locale,
	}: {
		entryPoints:
			| string[]
			| {in: string; out: string}[]
			| {[out: string]: string};
		outbase?: string;
		outdir: string;
		watch?: boolean;
		liveReload?: boolean;
		baseHref?: string;
		deployUrl?: string;
		minify?: boolean;
		locale?: string;
	},
) {
	if (!Array.isArray(entryPoints)) {
		entryPoints = Object.entries(entryPoints).map(([out, _in]) => ({
			in: _in,
			out,
		}));
	}

	const resultHandlers: (() => Promise<void>)[] = [];

	if (watch && liveReload) {
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
		const rawSource = await readFile(
			resolveWorkspacePath(context, htmlEntryPoint.in),
			'utf-8',
		);
		const dom = /<!doctype/i.test(rawSource)
			? parse(rawSource)
			: parseFragment(rawSource);

		const queue = [...dom.childNodes];
		let currentNode;
		while ((currentNode = queue.shift())) {
			if (!isElement(currentNode)) {
				continue;
			}

			queue.push(...currentNode.childNodes);

			switch (currentNode.tagName) {
				case 'script':
					process(getAttribute(currentNode, 'src'));
					setAttribute(currentNode, 'type', 'module');
					break;
				case 'img':
					process(getAttribute(currentNode, 'src'));
					break;
				case 'link':
					process(getAttribute(currentNode, 'href'));
					break;
				case 'base':
					if (baseHref) {
						// ensure base href starts and ends with /
						setAttribute(
							currentNode,
							'href',
							resolve('/', baseHref, dirname(htmlEntryPoint.out)) + '/',
						);
					}
					break;
				case 'html':
					{
						const lang = getAttribute(currentNode, 'lang');
						if (locale && lang) {
							lang.value = locale;
						}

						if (watch && liveReload) {
							const parentNode =
								currentNode.childNodes.find(
									(node): node is DefaultTreeAdapterMap['element'] =>
										node.nodeName === 'body',
								) ?? currentNode;

							parentNode.childNodes.push({
								nodeName: 'script',
								tagName: 'script',
								attrs: [
									{name: 'type', value: 'module'},
									{
										name: 'src',
										value: join(deployUrl, '__esbuild_reload__.js'),
									},
								],
								childNodes: [],
								parentNode: parentNode,
								namespaceURI: parentNode.namespaceURI,
							});
						}
					}
					break;
			}
		}

		resultHandlers.push(() =>
			writeFile(
				join(
					outdir,
					/\.html?$/.test(htmlEntryPoint.out)
						? htmlEntryPoint.out
						: `${htmlEntryPoint.out}.html`,
				),
				serialize(dom),
			),
		);

		// eslint-disable-next-line no-inner-declarations
		function process(
			attribute: DefaultTreeAdapterMap['element']['attrs'][number] | undefined,
		) {
			if (attribute == null) {
				return;
			}

			try {
				new URL(attribute.value);
				// -> the attribute is a fully qualified URL, no need to process
				return;
			} catch {
				// ignore
			}

			if (attribute.value.startsWith('/')) {
				// absolute URL, ignore as well
				return;
			}

			const newEntryIn = join(dirname(htmlEntryPoint.in), attribute.value);
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

				attribute.value = relative(dirname(htmlEntryPoint.out), entryOut);
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

function getAttribute(element: DefaultTreeAdapterMap['element'], name: string) {
	return element.attrs.find(attr => attr.name === name);
}

function setAttribute(
	element: DefaultTreeAdapterMap['element'],
	name: string,
	value: string,
) {
	const attribute = getAttribute(element, name);
	if (attribute != null) {
		attribute.value = value;
	} else {
		element.attrs.push({name, value});
	}
}
