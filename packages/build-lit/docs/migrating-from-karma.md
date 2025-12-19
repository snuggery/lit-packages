# Migrating from Karma to Vitest

Karma is no longer actively maintained. We strongly recommend migrating to Vitest for better performance, modern testing features, and active maintenance.

This guide assumes you're using karma with jasmine.

1. Update the builder from `@snuggery/build-lit:karma` to `@snuggery/build-lit:vitest` and edit the settings to match [those described for the vitest builder](./vitest-builder.md).
2. Update your tsconfig: remove `"karma"` and `"jasmine"` from the `compilerOptions.types` if they're present.
   Add `"vitest/globals"` to `compilerOptions.types`.
3. Create a `vitest.config.ts` file as below and configure its path in `vitestConfig` in the builder options.

   ```ts
   import {defineConfig} from "vitest/node";

   export default defineConfig({
   	test: {
   		globals: true,
   	},
   });
   ```

4. If you had a custom karma config, add the equivalent vitest config to the vitest config file.
5. Type-check your tests and make edits where necessary, e.g.
   - `jasmine.createSpy` -> `vi.fn`
   - `spyOn` -> `vi.spyOn`
   - `jasmine.anything()` -> `expect.anything()`
   - `jasmine.any(Type)` -> `expect.any(Type)`
   - &hellip;
