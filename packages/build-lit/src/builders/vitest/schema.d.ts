import type {JsonObject} from "@snuggery/core";

export type ReporterName =
	| "html"
	| "lcov"
	| "lcovonly"
	| "text"
	| "text-summary"
	| "cobertura"
	| "json"
	| "json-summary";

export type BuiltinReporter =
	| "default"
	| "verbose"
	| "dots"
	| "json"
	| "junit"
	| "tap"
	| "tap-flat"
	| "html";

export interface Schema {
	/**
	 * Specifies the build target to use for the unit test build in the format
	 * `project:target[:configuration]`. This defaults to the `build` target of the
	 * current project.
	 * You can also pass a comma-separated list of configurations. Example: `project:target:production,staging`.
	 */
	buildTarget?: string;

	/**
	 * The path to the TypeScript configuration file, relative to the workspace
	 * root. Defaults to `tsconfig.spec.json` in the project root if it exists. If not
	 * specified and the default does not exist, the `tsconfig` from the specified
	 * `buildTarget` will be used.
	 */
	tsconfig?: string;

	/**
	 * Specifies the configuration file for vitest.
	 *
	 * If a string is provided, it will be used as the path to the configuration file.
	 * If `true`, the builder will search for a default configuration file (e.g., `vitest.config.ts`).
	 * If `false`, no external configuration file will be used.
	 *
	 * This enables advanced options and the use of custom plugins.
	 */
	vitestConfig?: string | boolean;

	/**
	 * Specifies the browsers to use for test execution.
	 *
	 * When not specified, tests are run in a Node.js environment using jsdom.
	 * Browser names ending with 'Headless' (e.g., 'ChromeHeadless') will enable headless mode.
	 */
	browsers?: [string, ...string[]];

	/**
	 * Specifies the browser viewport dimensions for browser-based tests in the
	 * format `widthxheight`.
	 */
	browserViewport?: `${number}x${number}`;

	/**
	 * Specifies glob patterns of files to include for testing, relative to the
	 * project root. This option also has special handling for directory paths (includes
	 * all test files within) and file paths (includes the corresponding test file if
	 * one exists).
	 */
	include?: string[];

	/**
	 * Specifies glob patterns of files to exclude from testing, relative to the
	 * project root.
	 */
	exclude?: string[];

	/**
	 * Specifies a regular expression pattern to match against test suite and test
	 * names. Only tests with a name matching the pattern will be executed. For
	 * example, `^App` will run only tests in suites beginning with 'App'.
	 */
	filter?: string;

	/**
	 * Enables watch mode, which re-runs tests when source files change. Defaults
	 * to `true` in TTY environments and `false` otherwise.
	 *
	 * This property is ignored in CI environments.
	 */
	watch?: boolean;

	/**
	 * Enables debugging mode for tests, allowing the use of the Node Inspector.
	 */
	debug?: boolean;

	/**
	 * Enables the Vitest UI for interactive test execution.
	 *
	 * This option is ignored in CI environments.
	 */
	ui?: boolean;

	/**
	 * Enables coverage reporting for tests.
	 */
	coverage?: boolean;

	/**
	 * Specifies glob patterns of files to include in the coverage report.
	 */
	coverageInclude?: string[];

	/**
	 * Specifies glob patterns of files to exclude from the coverage report.
	 */
	coverageExclude?: string[];

	/**
	 * Specifies the reporters to use for coverage results. Each reporter can be
	 * a string representing its name, or a tuple containing the name and an options object.
	 *
	 * Built-in reporters include 'html', 'lcov', 'lcovonly', 'text',
	 * 'text-summary', 'cobertura', 'json', and 'json-summary'.
	 */
	coverageReporters?: (ReporterName | [ReporterName, JsonObject])[];

	/**
	 * Specifies minimum coverage thresholds that must be met. If thresholds are
	 * not met, the builder will exit with an error.
	 */
	coverageThresholds?: {
		/**
		 * When true, thresholds are enforced for each file individually.
		 */
		perFile?: boolean;

		/**
		 * Minimum percentage of statements covered.
		 */
		statements?: number;

		/**
		 * Minimum percentage of branches covered.
		 */
		branches?: number;

		/**
		 * Minimum percentage of functions covered.
		 */
		functions?: number;

		/**
		 * Minimum percentage of lines covered.
		 */
		lines?: number;
	};

	/**
	 * Specifies coverage watermarks for the HTML reporter. These determine the
	 * color coding for high, medium, and low coverage.
	 */
	coverageWatermarks?: {
		/**
		 * The high and low watermarks for statements coverage. `[low, high]`
		 */
		statements?: [number, number];

		/**
		 * The high and low watermarks for branches coverage. `[low, high]`
		 */
		branches?: [number, number];

		/**
		 * The high and low watermarks for functions coverage. `[low, high]`
		 */
		functions?: [number, number];

		/**
		 * The high and low watermarks for lines coverage. `[low, high]`
		 */
		lines?: [number, number];
	};

	/**
	 * Specifies the reporters to use during test execution.
	 *
	 * Each reporter can be a string representing its name, or a tuple containing
	 * the name and an options object.
	 * Built-in reporters include 'default', 'verbose', 'dots', 'json', 'junit',
	 * 'tap', 'tap-flat', and 'html'.
	 * You can also provide a path to a custom reporter.
	 */
	reporters?: (
		| BuiltinReporter
		| string
		| [BuiltinReporter | string, JsonObject]
	)[];

	/**
	 * Specifies a file path for the test report, applying only to the first
	 * reporter. To configure output files for multiple reporters, use the tuple format
	 * `['reporter-name', { outputFile: '...' }]` within the `reporters` option. When not
	 * provided, output is written to the console.
	 */
	outputFile?: string;

	/**
	 * A list of paths to global setup files that are executed before the test files.
	 */
	setupFiles?: string[];

	/**
	 * Shows build progress information in the console. Defaults to the `progress`
	 * setting of the specified `buildTarget`.
	 */
	progress?: boolean;

	/**
	 * Environment target(s) (e.g. es2017, chrome58, firefox57, safari11, edge16, node10, ie9, opera45, esnext) (default: es2022)
	 */
	target?: string | string[];

	/**
	 * Custom conditions to include during resolution
	 */
	conditions?: string[];

	/**
	 * Lists all discovered test files and exits the process without building or executing the tests.
	 */
	listTests?: boolean;

	/**
	 * Keep the temporary folder the tests are built into & log its path
	 */
	keepBuiltFiles?: boolean;
}
