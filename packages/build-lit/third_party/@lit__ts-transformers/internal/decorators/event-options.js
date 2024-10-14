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
exports.EventOptionsVisitor = void 0;
const typescript_1 = __importDefault(require("typescript"));
/**
 * Transform:
 *
 *   class MyElement extends LitElement {
 *
 *     @eventOptions({capture: true})
 *     private _onClick(event) {
 *       console.log('click', event.target);
 *     }
 *
 *     @eventOptions({passive: true})
 *     public onKeydown(event) {
 *       console.log('keydown', event.target);
 *     }
 *
 *     render() {
 *       return html`
 *         <button @click=${this._onClick}
 *                 @keydown=${this.onKeydown}>
 *           Foo
 *         </button>`;
 *     }
 *   }
 *
 * Into:
 *
 *   class MyElement extends LitElement {
 *
 *     _onClick(event) {
 *       console.log('click', event.target);
 *     }
 *
 *     onKeydown(event) {
 *       console.log('keydown', event.target);
 *     }
 *
 *     render() {
 *       return html`
 *         <button @click=${{handleEvent: (e) => this._onClick(e), capture: true}}
 *                 @keydown=${this.onKeydown}>
 *           Foo
 *         </button>
 *       `;
 *     }
 *   }
 *   Object.assign(MyElement.prototype.onKeydown, {passive: true});
 */
class EventOptionsVisitor {
    constructor({ factory }, program) {
        this.kind = 'memberDecorator';
        this.decoratorName = 'eventOptions';
        this._factory = factory;
        this._program = program;
    }
    visit(litClassContext, method, decorator) {
        if (!typescript_1.default.isMethodDeclaration(method)) {
            return;
        }
        if (!typescript_1.default.isCallExpression(decorator.expression)) {
            return;
        }
        if (!method.body) {
            return;
        }
        const [eventOptionsNode] = decorator.expression.arguments;
        if (eventOptionsNode === undefined ||
            !typescript_1.default.isObjectLiteralExpression(eventOptionsNode)) {
            return;
        }
        if (!typescript_1.default.isIdentifier(method.name)) {
            return;
        }
        if (!typescript_1.default.isClassDeclaration(method.parent) ||
            method.parent.name === undefined) {
            return;
        }
        litClassContext.litFileContext.nodeReplacements.set(decorator, undefined);
        // If not private, keep the method as it is and annotate options on it
        // directly, exactly like the decorator does.
        litClassContext.adjacentStatements.push(this._createMethodOptionsAssignment(method.parent.name.text, method.name.text, eventOptionsNode));
    }
    _createMethodOptionsAssignment(className, methodName, options) {
        const factory = this._factory;
        return factory.createCallExpression(factory.createPropertyAccessExpression(factory.createIdentifier('Object'), factory.createIdentifier('assign')), undefined, [
            factory.createPropertyAccessExpression(factory.createPropertyAccessExpression(factory.createIdentifier(className), factory.createIdentifier('prototype')), factory.createIdentifier(methodName)),
            options,
        ]);
    }
}
exports.EventOptionsVisitor = EventOptionsVisitor;
//# sourceMappingURL=event-options.js.map
