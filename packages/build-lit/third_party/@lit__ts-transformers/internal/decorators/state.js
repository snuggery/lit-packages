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
exports.StateVisitor = void 0;
const typescript_1 = __importDefault(require("typescript"));
const property_js_1 = require("./property.js");
/**
 * Transform:
 *
 *   @state()
 *   foo
 *
 * Into:
 *
 *   static get properties() {
 *     return {
 *       foo: {state: true}
 *     }
 *   }
 */
class StateVisitor extends property_js_1.PropertyVisitor {
    constructor() {
        super(...arguments);
        this.decoratorName = 'state';
    }
    _augmentOptions(options) {
        const factory = this._factory;
        return factory.createObjectLiteralExpression([
            ...(options !== undefined
                ? options.properties.filter((option) => {
                    const name = option.name !== undefined && typescript_1.default.isIdentifier(option.name)
                        ? option.name.text
                        : undefined;
                    return name !== 'state';
                })
                : []),
            factory.createPropertyAssignment(factory.createIdentifier('state'), factory.createTrue()),
        ]);
    }
}
exports.StateVisitor = StateVisitor;
//# sourceMappingURL=state.js.map