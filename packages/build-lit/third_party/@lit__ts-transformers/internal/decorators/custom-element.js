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
exports.CustomElementVisitor = void 0;
const typescript_1 = __importDefault(require("typescript"));
/**
 * Transform:
 *
 *   @customElement('my-element')
 *   class MyElement extends HTMLElement {}
 *
 * Into:
 *
 *   class MyElement extends HTMLElement {}
 *   customElements.define('my-element', MyElement)
 */
class CustomElementVisitor {
    constructor({ factory }) {
        this.kind = 'classDecorator';
        this.decoratorName = 'customElement';
        this._factory = factory;
    }
    visit(litClassContext, decorator) {
        if (litClassContext.class.name === undefined) {
            return;
        }
        if (!typescript_1.default.isCallExpression(decorator.expression)) {
            return;
        }
        const [arg0] = decorator.expression.arguments;
        if (arg0 === undefined || !typescript_1.default.isStringLiteral(arg0)) {
            return;
        }
        const elementName = arg0.text;
        const className = litClassContext.class.name.text;
        litClassContext.litFileContext.nodeReplacements.set(decorator, undefined);
        litClassContext.adjacentStatements.push(this._createCustomElementsDefineCall(elementName, className));
    }
    _createCustomElementsDefineCall(elementName, className) {
        const factory = this._factory;
        return factory.createExpressionStatement(factory.createCallExpression(factory.createPropertyAccessExpression(factory.createIdentifier('customElements'), factory.createIdentifier('define')), undefined, [
            factory.createStringLiteral(elementName),
            factory.createIdentifier(className),
        ]));
    }
}
exports.CustomElementVisitor = CustomElementVisitor;
//# sourceMappingURL=custom-element.js.map