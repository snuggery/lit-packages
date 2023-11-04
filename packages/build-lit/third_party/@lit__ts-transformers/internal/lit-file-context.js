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
exports.LitFileContext = void 0;
const typescript_1 = __importDefault(require("typescript"));
/**
 * State scoped to one module that contains Lit code.
 */
class LitFileContext {
    constructor(program) {
        /**
         * Maps from a Lit module ImportSpecifier to the canonical name within the Lit
         * packages for that export.
         */
        this.litImports = new Map();
        /**
         * Nodes that are to be replaced with another node (or removed when undefined)
         * when they are encountered in subsequent traversal.
         */
        this.nodeReplacements = new Map();
        this._program = program;
    }
    clear() {
        this.litImports.clear();
        this.nodeReplacements.clear();
    }
    /**
     * If the given node refers to a symbol imported from a Lit package, return
     * Lit's canonical name for that symbol.
     */
    getCanonicalName(node) {
        const symbol = this._program.getTypeChecker().getSymbolAtLocation(node);
        const firstDeclaration = symbol?.declarations?.[0];
        if (firstDeclaration === undefined ||
            !typescript_1.default.isImportSpecifier(firstDeclaration)) {
            return undefined;
        }
        return this.litImports.get(firstDeclaration);
    }
    /**
     * Replace one AST node with another, copying over all associated comments.
     */
    replaceAndMoveComments(oldNode, newNode) {
        this.nodeReplacements.set(oldNode, newNode);
        // Original source comments.
        typescript_1.default.setTextRange(newNode, oldNode);
        typescript_1.default.moveSyntheticComments(newNode, oldNode);
    }
}
exports.LitFileContext = LitFileContext;
//# sourceMappingURL=lit-file-context.js.map