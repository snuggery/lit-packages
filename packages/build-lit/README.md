# `@ngx-lit/build-lit`

Build lit-based web applications using the Angular CLI or Nx.

## Executors / Builders

- `@ngx-lit/build-lit:browser` builds a browser application using [`esbuild`][esbuild]
- `@ngx-lit/build-lit:dev-server` serves a browser application for local development, including support for hot reload and more
- `@ngx-lit/build-lit:extract-i18n` extracts XLIFF or XLB files from usage of `@lit/localize` in the source code
- `@ngx-lit/build-lit:karma` runs tests via [`karma`][karma]

[esbuild]: https://esbuild.github.io/
[karma]: https://karma-runner.github.io/6.4/index.html
