/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
import { Message } from '../messages.js';
import type { Locale } from '../types/locale.js';
import type { Config } from '../types/config.js';
import type { TransformOutputConfig } from '../types/modes.js';
import ts from 'typescript';
import { LitLocalizer } from '../index.js';
type TypeScriptTransformerFactoryFactory = (program: ts.Program) => ts.TransformerFactory<ts.SourceFile>;
/**
 * Localizes a Lit project in transform mode.
 */
export declare class TransformLitLocalizer extends LitLocalizer {
    config: Config & {
        output: TransformOutputConfig;
    };
    constructor(config: Config & {
        output: TransformOutputConfig;
    });
    /**
     * Compile the project for each locale, replacing all templates with their
     * localized versions, and write to the configured locale directory structure.
     */
    build(): Promise<void>;
    /**
     * Make a map from each locale code to a function that takes a TypeScript
     * Program and returns a TypeScript Transformer Factory that replaces all
     * `msg` calls with localized templates.
     *
     * This factory is suitable for inclusion in the `before` array of the
     * `customTransformers` parameter of the TypeScript `program.emit` method.
     */
    transformers(): Map<Locale, TypeScriptTransformerFactoryFactory>;
}
/**
 * Return a TypeScript TransformerFactory for the lit-localize transformer.
 */
export declare function litLocalizeTransform(translations: Map<string, Message> | undefined, locale: string, program: ts.Program): ts.TransformerFactory<ts.SourceFile>;
export {};
