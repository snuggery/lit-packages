# `@ngx-lit/build-angular`

This package contains tools for using [`lit`](https://lit.dev) elements in angular applications.

## Generating components

This package contains a schematic called `elements-to-components` that searches for lit elements and generates angular components.
These components make it possible to use these elements without having to disable the angular template compiler's checks via `CUSTOM_ELEMENTS_SCHEMA`.

## Building applications

This package provides builders to replace `@angular-devkit/build-angular` for applications that use lit elements which are localized using [`@lit/localize`](https://lit.dev/docs/localization/overview/).

The following builders are supported:

- `browser` for building browser applications,
- `dev-server` to support `ng serve`, and
- `extract-i18n` to get `@lit/localize` translations recognized as messages by Angular.

### How does it work?

These builders run angular's own builders with an extra webpack plugin that replaces `@lit/localize` code with angular's `$localize` function.
For example, the following code

```js
html`
	<button aria-label=${msg(str`Add new item`, {id: 'button-add'})}>+</button>
`;
```

becomes

```js
html`<button aria-label=${$localize`:@@button-add:Add new item`}>+</button>`;
```

Translations using the `html` tag are similarly rewritten, though the resulting code is a bit more complex.
