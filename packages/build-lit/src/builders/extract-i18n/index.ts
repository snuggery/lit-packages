import {
	type BuilderOutput,
	createBuilder,
	resolveTargetString,
	targetFromTargetString,
} from '@snuggery/architect';
import type {JsonObject} from '@snuggery/core';

import {readLocalizeToolsConfig} from '../../helpers/i18n-config.js';
import type {Schema as ApplicationSchema} from '../application/schema.js';

import type {Schema} from './schema.js';

export default createBuilder<Schema>(
	async (input, context): Promise<BuilderOutput> => {
		const applicationInput = await context.validateOptions<
			JsonObject & ApplicationSchema
		>(
			await context.getTargetOptions(
				targetFromTargetString(
					resolveTargetString(context, input.applicationTarget ?? 'build'),
				),
			),
			'@snuggery/build-lit:application',
		);

		const localizeConfiguration = await readLocalizeToolsConfig(
			context,
			applicationInput,
		);

		const {TransformLitLocalizer} = await import(
			'#@lit/localize-tools/lib/modes/transform.js'
		);

		const localizer = new TransformLitLocalizer(localizeConfiguration);

		await localizer.writeInterchangeFiles();
		return {success: true};
	},
);
