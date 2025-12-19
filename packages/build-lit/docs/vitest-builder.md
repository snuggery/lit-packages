# Vitest Builder

The `@snuggery/build-lit:vitest` builder provides a modern testing solution powered by [Vitest](https://vitest.dev/).

## Configuration Options

### Test Discovery

Control which test files are discovered and executed:

**JSON:**

```json
{
	"options": {
		"tsconfig": "tsconfig.spec.json",
		"include": ["**/*.test.ts", "**/*.spec.ts"],
		"exclude": ["**/node_modules/**", "**/dist/**"],
		"filter": "^MyComponent"
	}
}
```

**KDL:**

```kdl
options {
  tsconfig "tsconfig.spec.json"
  include "**/*.test.ts" "**/*.spec.ts"
  exclude "**/node_modules/**" "**/dist/**"
  filter "^MyComponent"
}
```

| Option    | Type       | Default | Description                                                                                                                                       |
| --------- | ---------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `include` | `string[]` | Auto    | Glob patterns for test files to include. When not provided and no external config is present, discovery uses your `tsconfig` and Vitest defaults. |
| `exclude` | `string[]` | -       | Glob patterns for test files to exclude                                                                                                           |
| `filter`  | `string`   | -       | Regex pattern to match test names (e.g., `"^App"` runs only tests in suites beginning with 'App')                                                 |

### Coverage

There are a bunch of options to configure coverage. All of these can be configured in the builder directly.
If you want to configure coverage reporting via your vitest config instead, set the `coverage` to `false` to stop the builder from overwriting your coverage configuration its own coverage config.

**JSON:**

```json
{
	"options": {
		"tsconfig": "tsconfig.spec.json",
		"coverage": true,
		"coverageInclude": ["src/**/*.ts", "src/**/*.js"],
		"coverageExclude": ["**/*.spec.ts", "**/*.test.ts"],
		"coverageReporters": ["text", "html", "lcov", "json"],
		"coverageThresholds": {
			"statements": 80,
			"branches": 80,
			"functions": 80,
			"lines": 80,
			"perFile": true
		},
		"coverageWatermarks": {
			"statements": [50, 80],
			"branches": [50, 80],
			"functions": [50, 80],
			"lines": [50, 80]
		}
	}
}
```

**KDL:**

```kdl
options {
  tsconfig "tsconfig.spec.json"
  coverage #true
  coverageInclude "src/**/*.ts" "src/**/*.js"
  coverageExclude "**/*.spec.ts" "**/*.test.ts"
  coverageReporters "text" "html" "lcov" "json"
  coverageThresholds {
    statements 80
    branches 80
    functions 80
    lines 80
    perFile #true
  }
  coverageWatermarks {
    statements 50 80
    branches 50 80
    functions 50 80
    lines 50 80
  }
}
```

#### Coverage Options

| Option               | Type                             | Description                                                                   |
| -------------------- | -------------------------------- | ----------------------------------------------------------------------------- |
| `coverage`           | `boolean`                        | Enable coverage reporting (opt-out)                                           |
| `coverageInclude`    | `string[]`                       | Files to include in coverage report                                           |
| `coverageExclude`    | `string[]`                       | Files to exclude from coverage report                                         |
| `coverageReporters`  | `(string \| [string, object])[]` | Coverage output formats: `html`, `lcov`, `text`, `json`, `json-summary`, etc. |
| `coverageThresholds` | `object`                         | Minimum coverage percentages (build fails if not met)                         |
| `coverageWatermarks` | `object`                         | Color coding for HTML reporter `[low, high]`                                  |

**Important:** Coverage is opt-out. When `coverage: true` without `coverageInclude`, Vitest uses intelligent defaults based on your project structure. The builder defaults vitest's configuration `coverage.provider` to `"v8"` and `coverage.reportsDirectory` to a folder named `coverage` in the project folder, these can be overwritten in a vitest configuration file.

### Browser Testing

Test components in real browsers using Playwright or WebdriverIO:

**JSON:**

```json
{
	"options": {
		"tsconfig": "tsconfig.spec.json",
		"browsers": ["chromium", "firefox"],
		"browserViewport": "1920x1080"
	}
}
```

**KDL:**

```kdl
options {
  tsconfig "tsconfig.spec.json"
  browsers "chromium" "firefox"
  browserViewport "1920x1080"
}
```

**Prerequisites:**

- Install `@vitest/browser-playwright` or `@vitest/browser-webdriverio`
- For Playwright, also install `playwright`
- For WebdriverIO, also install `webdriverio`

| Option            | Type       | Description                                                                                              |
| ----------------- | ---------- | -------------------------------------------------------------------------------------------------------- |
| `browsers`        | `string[]` | Browser names (e.g., `chromium`, `firefox`, `webkit`). Names ending with `Headless` enable headless mode |
| `browserViewport` | `string`   | Viewport dimensions as `widthxheight` (e.g., `1920x1080`)                                                |

### Reporters

Customize test output and reporting:

**JSON:**

```json
{
	"options": {
		"tsconfig": "tsconfig.spec.json",
		"reporters": [
			"verbose",
			["json", {"outputFile": "test-results.json"}],
			["junit", {"outputFile": "junit.xml"}]
		],
		"outputFile": "test-output.txt"
	}
}
```

**KDL:**

```kdl
options {
  tsconfig "tsconfig.spec.json"
  reporters {
    - verbose
    - json {
    	- outputFile=test-results.json
    }
    - junit {
    	- outputFile "junit.xml"
    }
  }
}
```

**Built-in reporters:**

- `default` - Standard terminal output
- `verbose` - Detailed test information
- `dots` - Minimal dot output
- `json` - JSON format
- `junit` - JUnit XML format
- `tap` / `tap-flat` - TAP format
- `html` - HTML report

| Option       | Type                             | Description              |
| ------------ | -------------------------------- | ------------------------ |
| `reporters`  | `(string \| [string, object])[]` | Test execution reporters |
| `outputFile` | `string`                         | Output file path         |

### Setup Files

Execute global setup code before tests:

**JSON:**

```json
{
	"options": {
		"setupFiles": ["src/test-setup.ts", "src/polyfills.ts"]
	}
}
```

**KDL:**

```kdl
options {
  setupFiles "src/test-setup.ts" "src/polyfills.ts"
}
```

Setup files execute before test files and can:

- Configure global test environment
- Register custom matchers
- Set up DOM polyfills
- Initialize test utilities

### Vitest Configuration File

Use a Vitest configuration file for advanced options:

**JSON:**

```json
{
	"options": {
		"vitestConfig": "vitest.config.ts"
	}
}
```

**KDL:**

```kdl
options {
  vitestConfig "vitest.config.ts"
}
```

Set `vitestConfig: true` to auto-discover configuration files:

- `vitest.config.mts`
- `vitest.config.cts`
- `vitest.config.ts`
- `vitest.config.mjs`
- `vitest.config.cjs`
- `vitest.config.js`

**Example vitest.config.ts:**

```typescript
import {defineConfig} from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		environment: "jsdom",
		setupFiles: ["./src/test-setup.ts"],
		coverage: {
			provider: "v8",
			reporter: ["text", "html", "lcov"],
		},
	},
});
```

### Development Options

**JSON:**

```json
{
	"options": {
		"tsconfig": "tsconfig.spec.json",
		"watch": true,
		"ui": true
	}
}
```

**KDL:**

```kdl
options {
  tsconfig "tsconfig.spec.json"
  watch #true
  ui #true
  debug #true
}
```

| Option  | Type      | Description                              |
| ------- | --------- | ---------------------------------------- |
| `watch` | `boolean` | Re-run tests on file changes             |
| `ui`    | `boolean` | Launch Vitest UI for interactive testing |
| `debug` | `boolean` | Enable Node.js inspector for debugging   |

The `watch` and `ui` options are ignored in CI environments.
Outside of CI environments, `watch` defaults to `true` in a TTY (i.e. in an interactive terminal) and to `false` in other scenarios.

### Build Options

Configure the underlying esbuild transformation:

**JSON:**

```json
{
	"options": {
		"target": ["es2020", "chrome90"],
		"conditions": ["development", "browser"]
	}
}
```

**KDL:**

```kdl
options {
  target "es2020" "chrome90"
  conditions "development" "browser"
}
```

| Option       | Type                 | Description                                                        |
| ------------ | -------------------- | ------------------------------------------------------------------ |
| `target`     | `string \| string[]` | esbuild target environments (e.g., `es2020`, `chrome90`, `node16`) |
| `conditions` | `string[]`           | Custom export conditions for module resolution                     |

## Complete Options Reference

| Option               | Type                             | Default   | Description                                                                                                                             |
| -------------------- | -------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `buildTarget`        | `string`                         | -         | Build target to use for unit test build (format: `project:target[:configuration]`). Options from the build target are used as defaults. |
| `tsconfig`           | `string`                         | -         | **Required.** Path to TypeScript configuration file                                                                                     |
| `vitestConfig`       | `string \| boolean`              | `false`   | Path to Vitest config file, or `true` to auto-discover                                                                                  |
| `include`            | `string[]`                       | Auto      | Glob patterns for test files to include (auto-discovered from tsconfig when not specified)                                              |
| `exclude`            | `string[]`                       | -         | Glob patterns for test files to exclude                                                                                                 |
| `filter`             | `string`                         | -         | Regex pattern to match against test names                                                                                               |
| `browsers`           | `string[]`                       | -         | Browsers for testing (requires provider package)                                                                                        |
| `browserViewport`    | `string`                         | -         | Browser viewport as `widthxheight`                                                                                                      |
| `coverage`           | `boolean`                        | `false`   | Enable coverage reporting                                                                                                               |
| `coverageInclude`    | `string[]`                       | -         | Files to include in coverage                                                                                                            |
| `coverageExclude`    | `string[]`                       | -         | Files to exclude from coverage                                                                                                          |
| `coverageReporters`  | `(string \| [string, object])[]` | -         | Coverage output formats                                                                                                                 |
| `coverageThresholds` | `object`                         | -         | Minimum coverage percentages                                                                                                            |
| `coverageWatermarks` | `object`                         | -         | Coverage watermarks for HTML reporter                                                                                                   |
| `reporters`          | `(string \| [string, object])[]` | -         | Test execution reporters                                                                                                                |
| `outputFile`         | `string`                         | -         | Output file for first reporter                                                                                                          |
| `setupFiles`         | `string[]`                       | -         | Global setup files                                                                                                                      |
| `watch`              | `boolean`                        | TTY-based | Enable watch mode                                                                                                                       |
| `ui`                 | `boolean`                        | `false`   | Enable Vitest UI                                                                                                                        |
| `debug`              | `boolean`                        | `false`   | Enable debugging mode                                                                                                                   |
| `target`             | `string \| string[]`             | -         | esbuild target environments                                                                                                             |
| `conditions`         | `string[]`                       | -         | Custom resolution conditions                                                                                                            |

## Examples

### Complete Production Setup

**JSON:**

```json
{
	"test": {
		"builder": "@snuggery/build-lit:vitest",
		"options": {
			"tsconfig": "tsconfig.spec.json",
			"coverage": true,
			"coverageInclude": ["src/**/*.ts"],
			"coverageExclude": ["**/*.spec.ts", "**/*.test.ts"],
			"coverageReporters": ["text", "html", "lcov"],
			"coverageThresholds": {
				"statements": 80,
				"branches": 75,
				"functions": 80,
				"lines": 80
			},
			"reporters": [
				"default",
				["junit", {"outputFile": "test-results/junit.xml"}]
			]
		}
	}
}
```

### Browser Testing Setup

**JSON:**

```json
{
	"test": {
		"builder": "@snuggery/build-lit:vitest",
		"options": {
			"tsconfig": "tsconfig.spec.json",
			"browsers": ["chromium"],
			"browserViewport": "1280x720",
			"setupFiles": ["src/test-setup.ts"]
		}
	}
}
```

### Development with UI

**JSON:**

```json
{
	"test": {
		"builder": "@snuggery/build-lit:vitest",
		"options": {
			"tsconfig": "tsconfig.spec.json",
			"vitestConfig": true,
			"ui": true,
			"watch": true
		}
	}
}
```

## See Also

- [Vitest Documentation](https://vitest.dev/) - Official Vitest docs
