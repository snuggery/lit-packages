import {
	type BuilderContext,
	type BuilderOutput,
	createBuilder,
} from '@angular-devkit/architect';
import type {BrowserBuilderOptions} from '@angular-devkit/build-angular';
import type {JsonObject} from '@angular-devkit/core';
import {from, Observable, type ObservableInput} from 'rxjs';

import {
	executeBrowserBuilder,
	executeDevServerBuilder,
	executeExtractI18nBuilder,
	executeKarmaBuilder,
} from './builders.js';

const wrapped = new Map<
	string,
	(
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		options: any,
		context: BuilderContext,
	) => ObservableInput<BuilderOutput>
>([
	['browser', executeBrowserBuilder],
	['dev-server', executeDevServerBuilder],
	['extract-i18n', executeExtractI18nBuilder],
	['karma', executeKarmaBuilder],
]);

export default createBuilder((options, context) => {
	const name = context.builder.builderName;
	const builder = wrapped.get(name.includes(':') ? name.split(':')[1]! : name);

	if (builder == null) {
		throw new Error(`Unexpected builder ${name}`);
	}

	return new Observable(subscriber => {
		context
			.validateOptions<BrowserBuilderOptions & JsonObject>(
				options,
				`@angular-devkit/build-angular:${name}`,
			)
			.then(
				validatedOptions => {
					if (subscriber.closed) {
						return;
					}

					subscriber.add(
						from(builder(validatedOptions, context)).subscribe(subscriber),
					);
				},
				error => subscriber.error(error),
			);
	});
});
