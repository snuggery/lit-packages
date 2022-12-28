<!-- cspell:word esbuild mousemove tagname -->

# ngx-lit

Repository with tool(s) for building [angular](https://angular.io) applications that contain [lit](https://lit.dev) components.

**This repository is a running investigation**, it's not meant to be used in production environments.

## Goal

The main goal of the app is to provide first-class integration of lit components into angular applications.
The packages contained here tackle different parts of the problems encountered while using lit in angular:

### Problem 1: Unknown elements

Note: this section applies to all custom elements, it isn't specific to lit.

The Angular template compiler has to know all elements contained within a template.
If any unknown element is used, the compiler yields an error, assuming the developer has either mistakenly entered the wrong element name forgotten to import the Angular module defining the component.

This behavior can be disabled by including either the `CUSTOM_ELEMENTS_SCHEMA` or the `NO_ERRORS_SCHEMA` in the consuming component or its defining module.
Using either of these poses a problem: developers lose the very useful error when they mistype a component's tagname or forget to import a component.

The solution is pretty self-explanatory: write shim Angular components that forward everything to the Custom Element.
This shim Angular component can be imported just like a regular Angular component, providing the same developer experience as if the component was written in Angular.

There's an extra benefit to this shim component: [the zone](https://angular.io/guide/zone).
Angular runs all code inside a zone that triggers its change detection whenever code stops executing inside the zone, among other things.
If we use Custom Elements directly within the Angular zone, code running in the component impacts the zone:

- Any asynchronous action, including event listeners, run inside the Angular zone.
  This can wreak havoc on the performance of an application for events that fire multiple times per frame (e.g. scroll, mousemove).
  This behavior is only present when accessing methods or properties on the Custom Element, but not when setting an attribute (as the `attributeChangedCallback` is asynchronous by design and it isn't patched by angular's zone implementation)
- Any open timers or asynchronous actions like open fetches cause the angular app to be marked as unstable.

Because the WebComponent doesn't have access to the Angular Dependency Injection engine (by design!), it cannot access the `NgZone` service to solve these problems like an Angular component would.
It therefore makes the most sense to run all WebComponent code outside of the Angular zone via the shim component, and similarly to ensure that all outputs are running back in the zone.

### Problem 2: i18n

Angular comes with an i18n implementation based on a global `$localize` template tag function.
Usage of this function is detected at build time, and the messages are replaced by their translations.
The runtime overhead of the `$localize` is effectively zero in production applications.

Lit comes with its own i18n implementation `@lit/localize` that uses a `msg` function which is either passed a `html` tagged template literal or a `str` tagged template literal.
There are two ways to use this functionality: you can replace these messages at build time (the result being very similar to Angular's `$localize` function) or you can keep the `msg` calls and provide the messages at runtime.

The way Lit and Angular handle i18n is inherently incompatible:

- We cannot use `$localize` in the lit component because it would tie these components to Angular.
  In a non-Angular context the `$localize` global would not exist, resulting in a broken application.
  Even if it did exist, `$localize` works with strings so it only replaces `msg` combined with `str` but cannot replace `msg` with `html`, which severely means it's impossible to translate messages that contain markup.
- The `msg` function is not detected by the Angular application build.
  This means lit's i18n is limited to running in "runtime mode", and developers have to use both Lit's localization tooling ánd Angular's localization tooling to ensure the entire application ends up being translated.

There are multiple ways to tackle this problem, and each comes with its own pros and cons:

#### Solution 1: rewire `@lit/localize` to `$localize`

In short: a transformer is applied on the Lit code replacing all usage of `msg` with `$localize`.
Using some funky transformations and assuming Lit isn't actually limited to template literal usage ([see comment](https://github.com/lit/lit/blob/2994a961a6e3ef297c4f15d9e6baf2106fb1cbad/packages/lit-html/src/lit-html.ts#L819-L823)) we can effectively create the behavior of lit's own build time translations.

This requires hooking into angular's build, extending the Webpack configuration to insert the replacement at the right time.
This extra step probably requires a separate parsing of all relevant javascript files, meaning it does impact the speed of the build.
A separate implementation will be needed if angular goes ahead with its esbuild-based builder.
Writing the proper sourcemap for the transformation will be necessary for `ng extract-i18n` to find the proper source text.

As far as user experience is concerned, this solution is the most advantageous as the translations are inline with more or less no runtime impact.

#### Solution 4: perform translations at runtime

We can hook into `@lit/localize` and insert our own translation
