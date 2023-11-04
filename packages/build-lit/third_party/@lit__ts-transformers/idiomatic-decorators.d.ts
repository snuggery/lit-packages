/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
import ts from 'typescript';
/**
 * TypeScript transformer which transforms all Lit decorators to their idiomatic
 * JavaScript style.
 *
 * Example input:
 *
 *   import {LitElement} from 'lit';
 *   import {customElement, property, query} from 'lit/decorators.js';
 *
 *   @customElement('simple-greeting');
 *   class SimpleGreeting extends LitElement {
 *     @property({type: String})
 *     name = 'Somebody';
 *
 *     @query('#myButton');
 *     button;
 *   }
 *
 * Example output:
 *
 *   import {LitElement} from 'lit';
 *
 *   class SimpleGreeting extends LitElement {
 *     static properties = {
 *       name: {type: String}
 *     };
 *
 *     constructor() {
 *       super();
 *       this.name = 'Somebody';
 *     }
 *
 *     get button() {
 *       return this.renderRoot?.querySelector('#myButton') ?? null;
 *     }
 *   }
 *   customElements.define('simple-greeting', SimpleGreeting);
 */
export declare function idiomaticDecoratorsTransformer(program: ts.Program): ts.TransformerFactory<ts.SourceFile>;
