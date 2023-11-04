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
const ts_clone_node_1 = require("ts-clone-node");
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
        // If private, assume no outside access is possible, and transform any
        // references to this function inside template event bindings to
        // `{handleEvent: (e) => this._onClick(e), ...options}` objects.
        if (method.modifiers?.some((mod) => mod.kind === typescript_1.default.SyntaxKind.PrivateKeyword)) {
            const methodSymbol = this._program
                .getTypeChecker()
                .getSymbolAtLocation(method.name);
            if (methodSymbol !== undefined) {
                litClassContext.additionalClassVisitors.add(new EventOptionsBindingVisitor(this._factory, this._program, methodSymbol, eventOptionsNode));
                return;
            }
        }
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
/**
 * Transforms Lit template event bindings for a particular event handler method
 * that was annotated with @eventOptions.
 */
class EventOptionsBindingVisitor {
    constructor(factory, program, eventHandlerSymbol, eventOptionsNode) {
        this.kind = 'generic';
        this._factory = factory;
        this._program = program;
        this._eventHandlerSymbol = eventHandlerSymbol;
        this._eventOptionsNode = eventOptionsNode;
    }
    visit(litFileContext, node) {
        if (!typescript_1.default.isPropertyAccessExpression(node)) {
            return node;
        }
        if (node.parent === undefined ||
            !this._isLitEventBinding(litFileContext, node.parent)) {
            return node;
        }
        const symbol = this._program
            .getTypeChecker()
            .getSymbolAtLocation(node.name);
        if (symbol !== this._eventHandlerSymbol) {
            return node;
        }
        return this._createEventHandlerObject(node);
    }
    _isLitEventBinding(litFileContext, span) {
        if (!typescript_1.default.isTemplateSpan(span)) {
            return false;
        }
        const template = span.parent;
        if (template === undefined || !typescript_1.default.isTemplateExpression(template)) {
            return false;
        }
        const tagged = template.parent;
        if (!typescript_1.default.isTaggedTemplateExpression(tagged)) {
            return false;
        }
        const pos = template.templateSpans.indexOf(span);
        if (pos === -1) {
            return false;
        }
        const priorText = pos === 0
            ? template.head.text
            : template.templateSpans[pos - 1].literal.text;
        if (priorText.match(/@[^\s"'>]+\s*=\s*["']*$/) === null) {
            return false;
        }
        // Note we check for the lit tag last because it requires the type checker
        // which is expensive.
        if (litFileContext.getCanonicalName(tagged.tag) !== 'html') {
            return false;
        }
        return true;
    }
    _createEventHandlerObject(eventHandlerReference) {
        const factory = this._factory;
        return factory.createObjectLiteralExpression([
            factory.createPropertyAssignment(factory.createIdentifier('handleEvent'), factory.createArrowFunction(undefined, undefined, [
                factory.createParameterDeclaration(undefined, undefined, factory.createIdentifier('e')),
            ], undefined, factory.createToken(typescript_1.default.SyntaxKind.EqualsGreaterThanToken), factory.createCallExpression(
            // Clone because there could be multiple event bindings and each
            // needs its own copy of the event handler reference.
            (0, ts_clone_node_1.cloneNode)(eventHandlerReference, { factory: factory }), undefined, [factory.createIdentifier('e')]))),
            ...this._eventOptionsNode.properties.map((property) => 
            // Clone because there could be multiple event bindings and each needs
            // its own copy of the event options.
            (0, ts_clone_node_1.cloneNode)(property, { factory: factory })),
        ], false);
    }
}
//# sourceMappingURL=event-options.js.map