import {
	type BuilderContext,
	BuildFailureError,
	resolveWorkspacePath,
} from '@snuggery/architect';
import {isJsonArray, isJsonObject} from '@snuggery/core';

import type {Schema} from '../builders/browser/schema.js';

import type {Config} from '#@lit/localize-tools/lib/types/config.js';
import type {FormatConfig} from '#@lit/localize-tools/lib/types/formatters.js';
import type {Locale} from '#@lit/localize-tools/lib/types/locale.js';
import type {TransformOutputConfig} from '#@lit/localize-tools/lib/types/modes.js';

interface I18nConfiguration {
	sourceLocale: Locale;

	targetLocales: Locale[];

	interchange: FormatConfig;
}

async function readI18nConfiguration(
	context: BuilderContext,
): Promise<I18nConfiguration> {
	if (!context.target?.target) {
		throw new BuildFailureError('Using i18n requires a project');
	}

	const {i18n} = await context.getProjectMetadata(context.target.project);
	const {isLocale} = await import('#@lit/localize-tools/lib/locales.js');

	if (i18n == null) {
		throw new BuildFailureError('Project is missing i18n configuration');
	}
	if (!isJsonObject(i18n)) {
		throw new BuildFailureError(
			"Project's i18n metadata is misconfigured, expected an object",
		);
	}

	const {sourceLocale, targetLocales, interchange} = i18n;

	if (
		sourceLocale != null &&
		(typeof sourceLocale !== 'string' || !isLocale(sourceLocale))
	) {
		throw new BuildFailureError('Expected sourceLocale to be a locale string');
	}

	if (
		!isJsonArray(targetLocales) ||
		targetLocales.some(l => typeof l !== 'string' || !isLocale(l))
	) {
		throw new BuildFailureError(
			'Expected targetLocales to be an array of locale strings',
		);
	}

	return {
		sourceLocale: sourceLocale ?? ('en-US' as Locale),
		targetLocales: targetLocales as unknown[] as Locale[],
		interchange: interchange as unknown as FormatConfig,
	};
}

export async function readLocalizeToolsConfig(
	context: BuilderContext,
	input: Schema,
) {
	if (input.tsconfig == null) {
		throw new BuildFailureError(
			'The tsconfig setting is required when using localize',
		);
	}

	const i18n = await readI18nConfiguration(context);

	const config: Config & {output: TransformOutputConfig; tsConfig: string} = {
		baseDir: context.workspaceRoot,
		resolve: path => resolveWorkspacePath(context, path),
		sourceLocale: i18n.sourceLocale,
		targetLocales: i18n.targetLocales,
		tsConfig: resolveWorkspacePath(context, input.tsconfig),
		interchange: i18n.interchange,
		output: {mode: 'transform'},
	};

	return config;
}
