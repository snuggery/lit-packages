"use strict";
/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LitClassContext = void 0;
/**
 * State scoped to one Lit class.
 */
class LitClassContext {
    constructor(litFileContext, class_) {
        /**
         * Add a new class member to this element (e.g. a new getter).
         */
        this.classMembers = [];
        /**
         * Additional statements to append to the class constructor body. A new
         * constructor will be created if one doesn't already exist.
         */
        this.extraConstructorStatements = [];
        /**
         * Add a new property to the `static get properties` block of this element.
         */
        this.reactiveProperties = [];
        /**
         * Add a new statement that will be inserted into the AST immediately after
         * this element (e.g. a customElements.define() call).
         */
        this.adjacentStatements = [];
        /**
         * Additional visitors that will run only in the scope of the current class.
         */
        this.additionalClassVisitors = new Set();
        this.litFileContext = litFileContext;
        this.class = class_;
    }
}
exports.LitClassContext = LitClassContext;
//# sourceMappingURL=lit-class-context.js.map