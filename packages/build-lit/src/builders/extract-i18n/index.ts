import {
	type BuilderOutput,
	createBuilder,
	resolveTargetString,
	targetFromTargetString,
} from '@snuggery/architect';
import type {JsonObject} from '@snuggery/core';

import {readLocalizeToolsConfig} from '../../helpers/i18n-config.js';
import type {Schema as BrowserSchema} from '../browser/schema.js';

import type {Schema} from './schema.js';

export default createBuilder<Schema>(
	async (input, context): Promise<BuilderOutput> => {
		const browserInput = await context.validateOptions<
			JsonObject & BrowserSchema
		>(
			await context.getTargetOptions(
				targetFromTargetString(
					resolveTargetString(context, input.browserTarget ?? 'build'),
				),
			),
			'@snuggery/build-lit:browser',
		);

		const localizeConfiguration = await readLocalizeToolsConfig(
			context,
			browserInput,
		);

		const {TransformLitLocalizer} = await import(
			'#@lit/localize-tools/lib/modes/transform.js'
		);

		const localizer = new TransformLitLocalizer(localizeConfiguration);

		await localizer.writeInterchangeFiles();
		return {success: true};
	},
);
