"use strict";
/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryAssignedNodesVisitor = void 0;
const query_assigned_elements_js_1 = require("./query-assigned-elements.js");
/**
 * Transform:
 *
 *   @queryAssignedNodes({slot: 'list'})
 *   listItems
 *
 * Into:
 *
 *   get listItems() {
 *     return this.renderRoot
 *       ?.querySelector('slot[name=list]')
 *       ?.assignedNodes() ?? [];
 *   }
 */
class QueryAssignedNodesVisitor extends query_assigned_elements_js_1.QueryAssignedElementsVisitor {
    constructor() {
        super(...arguments);
        this.decoratorName = 'queryAssignedNodes';
        this.slottedQuery = 'assignedNodes';
    }
}
exports.QueryAssignedNodesVisitor = QueryAssignedNodesVisitor;
//# sourceMappingURL=query-assigned-nodes.js.map