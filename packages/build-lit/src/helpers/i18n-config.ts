import type {BuilderContext} from '@angular-devkit/architect';
import type {
	Config,
	TransformOutputConfig,
} from '@lit/localize-tools/lib/config.js';
import type {FormatConfig} from '@lit/localize-tools/lib/types/formatters.js';
import type {Locale} from '@lit/localize-tools/lib/types/locale.js';
import {resolveWorkspacePath} from '@snuggery/architect';
import {isJsonArray, isJsonObject} from '@snuggery/core';

import type {Schema} from '../builders/browser/schema.js';

interface I18nConfiguration {
	sourceLocale: Locale;

	targetLocales: Locale[];

	interchange: FormatConfig;
}

async function readI18nConfiguration(context: BuilderContext) {
	if (!context.target?.target) {
		return {error: 'Using i18n requires a project'};
	}

	const {i18n = {}} = await context.getProjectMetadata(context.target.project);
	const {isLocale} = await import('@lit/localize-tools/lib/locales.js');

	if (!isJsonObject(i18n)) {
		return {
			error: `Project's i18n metadata is misconfigured, expected an object`,
		};
	}

	const {sourceLocale, targetLocales, interchange} = i18n;

	if (typeof sourceLocale !== 'string' || !isLocale(sourceLocale)) {
		return {error: `Expected sourceLocale to be a locale string`};
	}

	if (
		!isJsonArray(targetLocales) ||
		targetLocales.some(l => typeof l !== 'string' || !isLocale(l))
	) {
		return {error: `Expected targetLocales to be an array of locale strings`};
	}

	return {
		sourceLocale,
		targetLocales: targetLocales as unknown[] as Locale[],
		interchange: interchange as unknown as FormatConfig,
	} as I18nConfiguration;
}

export async function readLocalizeToolsConfig(
	context: BuilderContext,
	input: Schema,
) {
	if (input.tsconfig == null) {
		return {error: 'The tsConfig setting is required when using localize'};
	}

	const i18n = await readI18nConfiguration(context);
	if ('error' in i18n) {
		return i18n;
	}

	const config: Config & {output: TransformOutputConfig; tsConfig: string} = {
		baseDir: context.workspaceRoot,
		resolve: path => resolveWorkspacePath(context, path),
		sourceLocale: i18n.sourceLocale,
		targetLocales: i18n.targetLocales,
		tsConfig: resolveWorkspacePath(context, input.tsconfig),
		interchange: i18n.interchange,
		output: {mode: 'transform'},
	};

	return {
		config,
	};
}
