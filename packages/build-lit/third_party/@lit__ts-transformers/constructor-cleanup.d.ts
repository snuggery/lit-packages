/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
import ts from 'typescript';
/**
 * TypeScript transformer which improves the readability of the default
 * TypeScript constructor transform.
 *
 * This transform does the following:
 *
 * - If the constructor was declared in the original source, it will be restored
 *   to its original position.
 *
 * - If the constructor was NOT declared in the original source, it will be
 *   moved just below the final static member of the class, and a blank line
 *   placeholder comment will be added above.
 *
 * - Simplify `super(...)` calls to `super()` in class constructors, unless the
 *   class has any super-classes with constructors that takes parameters.
 *
 * IMPORTANT: This class MUST run as an "after" transformer. If it is run as a
 * "before" transformer, it won't have access to synthesized constructors, and
 * will have no effect.
 */
export declare function constructorCleanupTransformer(program: ts.Program): ts.TransformerFactory<ts.SourceFile>;
