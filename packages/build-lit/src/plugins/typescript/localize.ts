import {BuildFailureError} from '@snuggery/architect';
import type {Program, SourceFile, TransformerFactory} from 'typescript';

import {getTypescript} from '../../helpers/typescript.js';

import type {Config} from '#@lit/localize-tools/lib/types/config.js';
import type {Locale} from '#@lit/localize-tools/lib/types/locale.js';
import type {TransformOutputConfig} from '#@lit/localize-tools/lib/types/modes.js';

export async function createLocalizeTransformerFactories(
	config: Config & {
		output: TransformOutputConfig;
	},
): Promise<
	ReadonlyMap<Locale, (program: Program) => TransformerFactory<SourceFile>>
> {
	await getTypescript();

	try {
		await import('@lit/localize');
	} catch {
		throw new BuildFailureError(
			'Package @lit/localize must be installed to use localization',
		);
	}

	const {TransformLitLocalizer} = await import(
		'#@lit/localize-tools/lib/modes/transform.js'
	);

	const localizer = new TransformLitLocalizer(config);

	return localizer.transformers();
}
