import {createBuilder} from '@angular-devkit/architect';
import type {
	BrowserBuilderOptions,
	DevServerBuilderOptions,
	ExtractI18nBuilderOptions,
} from '@angular-devkit/build-angular';
import type {JsonObject} from '@angular-devkit/core';
import {from} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {
	executeBrowserBuilder,
	executeDevServerBuilder,
	executeExtractI18nBuilder,
} from './builders.js';

export const browser = createBuilder<BrowserBuilderOptions & JsonObject>(
	(options: BrowserBuilderOptions & JsonObject, context) =>
		from(
			context.validateOptions<BrowserBuilderOptions & JsonObject>(
				options,
				'@angular-devkit/build-angular:browser',
			),
		).pipe(switchMap(options => executeBrowserBuilder(options, context))),
);

export const devServer = createBuilder<DevServerBuilderOptions & JsonObject>(
	(options: DevServerBuilderOptions & JsonObject, context) =>
		from(
			context.validateOptions<DevServerBuilderOptions & JsonObject>(
				options,
				'@angular-devkit/build-angular:dev-server',
			),
		).pipe(switchMap(options => executeDevServerBuilder(options, context))),
);

export const extractI18n = createBuilder<
	ExtractI18nBuilderOptions & JsonObject
>((options: ExtractI18nBuilderOptions & JsonObject, context) =>
	from(
		context.validateOptions<ExtractI18nBuilderOptions & JsonObject>(
			options,
			'@angular-devkit/build-angular:extract-i18n',
		),
	).pipe(switchMap(options => executeExtractI18nBuilder(options, context))),
);
