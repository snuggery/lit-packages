import {BuildFailureError} from '@snuggery/architect';
import type {Program, SourceFile, TransformerFactory} from 'typescript';

import {getTypescript} from '../../helpers/typescript.js';

export async function createDecoratorTransformerFactory({
	tsconfig,
	inputFiles,
}: {
	inputFiles?: string[];
	tsconfig?: string;
}): Promise<(program: Program) => TransformerFactory<SourceFile>> {
	if (!inputFiles?.length && tsconfig == null) {
		throw new BuildFailureError(
			`Inlining decorators requires typescript and a tsconfig`,
		);
	}

	await getTypescript();

	const {idiomaticDecoratorsTransformer} = await import(
		'#@lit/ts-transformers'
	);

	return idiomaticDecoratorsTransformer;
}
