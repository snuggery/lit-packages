"use strict";
/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.idiomaticDecoratorsTransformer = void 0;
const typescript_1 = __importDefault(require("typescript"));
const lit_transformer_js_1 = require("./internal/lit-transformer.js");
const custom_element_js_1 = require("./internal/decorators/custom-element.js");
const property_js_1 = require("./internal/decorators/property.js");
const state_js_1 = require("./internal/decorators/state.js");
const query_js_1 = require("./internal/decorators/query.js");
const query_all_js_1 = require("./internal/decorators/query-all.js");
const query_async_js_1 = require("./internal/decorators/query-async.js");
const query_assigned_elements_js_1 = require("./internal/decorators/query-assigned-elements.js");
const query_assigned_nodes_js_1 = require("./internal/decorators/query-assigned-nodes.js");
const event_options_js_1 = require("./internal/decorators/event-options.js");
const localized_js_1 = require("./internal/decorators/localized.js");
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
function idiomaticDecoratorsTransformer(program) {
    return (context) => {
        const transformer = new lit_transformer_js_1.LitTransformer(program, context, [
            new custom_element_js_1.CustomElementVisitor(context),
            new property_js_1.PropertyVisitor(context),
            new state_js_1.StateVisitor(context),
            new query_js_1.QueryVisitor(context),
            new query_all_js_1.QueryAllVisitor(context),
            new query_async_js_1.QueryAsyncVisitor(context),
            new query_assigned_elements_js_1.QueryAssignedElementsVisitor(context),
            new query_assigned_nodes_js_1.QueryAssignedNodesVisitor(context),
            new event_options_js_1.EventOptionsVisitor(context, program),
            new localized_js_1.LocalizedVisitor(context),
        ]);
        return (file) => {
            return typescript_1.default.visitNode(file, transformer.visitFile);
        };
    };
}
exports.idiomaticDecoratorsTransformer = idiomaticDecoratorsTransformer;
//# sourceMappingURL=idiomatic-decorators.js.map