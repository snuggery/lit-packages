# `@snuggery/build-lit`

Build lit-based web applications

## Commands

The `build-lit` command exposed by this package currently supports four subcommands:

- `build-lit build` builds a browser application using [`esbuild`][esbuild]
- `build-lit serve` serves a browser application for local development, including support for hot reload and more
- `build-lit extract-i18n` extracts XLIFF or XLB files from usage of `@lit/localize` in the source code
- `build-lit test` runs tests via [`karma`][karma]

These commands accept options, add `--help` to see them listed.
Options can also be configured in a file called `build-lit.config.json`, `build-lit.config.yaml`, or `build-lit.config.kdl`.
Bags of options can be configured as a whole via `configurations`, which can be enabled via the `--configuration` flag.

Here's an example configuration file:

```json
{
	"build": {
		"options": {
			"tsconfig": "tsconfig.json",
			"baseHref": "/lorem/ipsum",
			"entryPoints": ["src/index.html", "src/lib.ts"]
		},

		"configurations": {
			"translated": {
				"localize": ["en", "nl"]
			}
		}
	},
	"test": {
		"options": {
			"karmaConfig": "karma.conf.cjs",
			"tsconfig": "tsconfig.spec.json"
		}
	},
	"i18n": {
		"sourceLocale": "en-US",
		"targetLocales": ["nl", "en"],
		"interchange": {
			"format": "xliff",
			"xliffDir": "locale"
		}
	}
}
```

## Using `nx` or `@angular/cli`

The `build-lit` CLI is powered by the same system used by `nx` or `ng`, called "builders" or "executors" respectively.
If you're already using either CLI, you can configure the following builders to keep using that same CLI you're already used to:

- `@snuggery/build-lit:browser` builds a browser application using [`esbuild`][esbuild]
- `@snuggery/build-lit:dev-server` serves a browser application for local development, including support for hot reload and more
- `@snuggery/build-lit:extract-i18n` extracts XLIFF or XLB files from usage of `@lit/localize` in the source code
- `@snuggery/build-lit:karma` runs tests via [`karma`][karma]

### `build-lit build` / `@snuggery/build-lit:browser`

Build a browser application using esbuild. Some esbuild settings can be configured in your workspace configuration, such as the target or a header/footer to include a license.

#### Styles

Styles can be written in `.css`, `.sass`, or `.scss` files.

Styles imported from JavaScript or TypeScript are turned into JavaScript files with a default export that's a lit `CSSResult`, which can be passed into a `LitElement`'s `styles`. Sass files support importing files from dependencies, without leading `~`.
To teach TypeScript about these files, add `@snuggery/build-lit/styles` to `compilerOptions.types` in your `tsconfig.json`.

#### Entry Points

The entry points passed into the `entryPoints` array take the same format as the entry points passed into esbuild directly.
You can include scripts, HTML files, styles, and assets.

#### Assets

<!-- cspell:ignore webp webm -->

Assets with file extensions `.png`, `.jpg` (or `.jpeg`), `.gif`, `.ico`, `.svg`, `.avif`, `.mp4`, `.webp`, `.webm`, `.woff2` (or `.woff`), and `.json` can be referenced from within style entry points, within styles imported from HTML files, or within scripts. They (currently) cannot be referenced from within styles imported from scripts.

If the asset is imported from HTML or from styles, the URL in the HTML file or style is updated to reflect the final location, including cache busting. Imports from scripts yield a default export pointing to the asset.

#### Internationalization

Applications can be translated into multiple locales. This requires configuration in your workspace inside an `i18n` block, e.g.

```jsonc
{
  "i18n": {
    // The locale source code is written in, defaults to en-US
    "sourceLocale": "en-US",
    // Supported target locales for translation
		"targetLocales": ["nl", "en"],
    // An interchange object as defined in a lit-localize.json file,
    // see https://lit.dev/docs/localization/cli-and-config/#cli
    "interchange": {
      "format": "xliff",
			"xliffDir" "application/locales"
    }
  }
}
```

Pass a `localize` option into the build with as value one or more locales as defined in the `targetLocales`. If you pass a `baseHref` path, the locale name will be appended to the path if an array of locales is passed in `localize`. It's also possible to pass into `baseHref` an object mapping locale names onto the path to use for that locale.

#### Conditions

Custom conditions can be added via the `conditions` option. The `development` or `production` condition is added automatically based on the value of `minify`.

### `build-lit serve` / `@snuggery/build-lit:dev-server`

Serve an application using esbuild.

#### Build Options

The build options are configured in a configured `@snuggery/build-lit:browser` target. Pass the name of this target as `browserTarget`.

You can pass a fully resolved target, such as `application:build` or with configuration(s) `application:build:local,dutch`.
You can also pass a relative target, such as `build` or with configuration(s) `:build:local,dutch`.

The default target is `build`.

The `localize` build option is ignored.

#### Localization

Serving (currently) only supports a single language. You can pass a single locale as `localize` option. This has to be configured in the `dev-server` target, not in the `browser` target.

#### Serve Options

You can configure the `host` and `port` to serve the application on.

You can configure whether to watch for changes. This includes live reloading when changes are discovered. The `watch` option defaults to `true`.

### `build-lit extract-i18n` / `@snuggery/build-lit:extract-i18n`

Create XLF or XMB files for translation.

#### Build Options

Build options are configured via a `browserTarget` property, just like in `@snuggery/build-lit:dev-server`.

#### Translation Options

The only options required for the `extract-i18n` builder are the `i18n` section as described in the "Internationalization" section.

### `build-lit test` / `@snuggery/build-lit:karma`

Run tests via karma

#### Build Options

You can configure certain `esbuild` options, like for the `browser` builder.

#### Files to Test

You can configure what files to test by passing glob(s) into `inputFiles`. If you don't pass any `inputFiles`, the files included in the typescript configuration passed as `tsconfig` are used instead. You must pass `inputFiles` or `tsconfig`, or both.

#### Karma Options

Karma requires configuration via a configuration file. Pass the path to this file into the `karmaConfig` option.

Your karma configuration file can configure its own framework, pre-processors, reporters, etc. Your karma configuration doesn't configure the included files and you don't have to configure how to build the project. You also can't configure `watch` and `singleRun`, these options are handled via the `watch` option in this builder.

## License

Licensed under the MIT license, see `LICENSE.md`.

This package contains a modified copy of [`karma-esbuild`](https://github.com/marvinhagemeister/karma-esbuild), licensed under the MIT license, see `third_party/karma-esbuild/README.md`.

This package contains a modified and trimmed copy of [`@lit/localize-tools`](https://github.com/lit/lit), licensed under the MIT license, see `third_party/@lit__localize-tools/LICENSE`.

[esbuild]: https://esbuild.github.io/
[karma]: https://karma-runner.github.io/6.4/index.html
