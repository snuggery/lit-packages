/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
import fsPromises from 'fs/promises';
import * as pathLib from 'path';
import { KnownError } from './error.js';
import { escapeTextContentToEmbedInTemplateLiteral } from './typescript.js';
/**
 * Return whether the given string is formatted like a BCP 47 language tag. Note
 * we don't currently strictly validate against a known list of codes.
 */
export function isLocale(x) {
    return x.match(/^[a-zA-Z0-9]+(-[a-zA-Z0-9]+)*$/) !== null;
}
const templateLit = (str) => '`' + escapeTextContentToEmbedInTemplateLiteral(str) + '`';
/**
 * Generate a TypeScript module that exports a project's source and target
 * locale codes, and write it to the given file path.
 */
export async function writeLocaleCodesModule(sourceLocale, targetLocales, filePath) {
    const isTypeScript = filePath.endsWith('.ts');
    const targetLocalesArrayContents = [...targetLocales]
        .sort((a, b) => a.localeCompare(b))
        .map(templateLit)
        .join(',\n  ');
    const allLocalesArrayContents = [sourceLocale, ...targetLocales]
        .sort((a, b) => a.localeCompare(b))
        .map(templateLit)
        .join(',\n  ');
    const src = `// Do not modify this file by hand!
// Re-generate this file by running lit-localize.

/**
 * The locale code that templates in this source code are written in.
 */
export const sourceLocale = ${templateLit(sourceLocale)};

/**
 * The other locale codes that this application is localized into. Sorted
 * lexicographically.
 */
export const targetLocales = [
  ${targetLocalesArrayContents},
]${isTypeScript ? ' as const' : ''};

/**
 * All valid project locale codes. Sorted lexicographically.
 */
export const allLocales = [
  ${allLocalesArrayContents},
]${isTypeScript ? ' as const' : ''};
`;
    const parentDir = pathLib.dirname(filePath);
    try {
        await fsPromises.mkdir(parentDir, { recursive: true });
    }
    catch (e) {
        throw new KnownError(`Error creating locales module directory: ${parentDir}\n` +
            `Do you have write permission?\n` +
            e.message);
    }
    try {
        await fsPromises.writeFile(filePath, src, 'utf8');
    }
    catch (e) {
        throw new KnownError(`Error creating locales module file: ${filePath}\n` +
            `Do you have write permission?\n` +
            e.message);
    }
}
//# sourceMappingURL=locales.js.map
