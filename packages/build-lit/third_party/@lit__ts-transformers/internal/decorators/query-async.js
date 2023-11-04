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
exports.QueryAsyncVisitor = void 0;
const typescript_1 = __importDefault(require("typescript"));
/**
 * Transform:
 *
 *   @queryAsync('#myButton')
 *   button
 *
 * Into:
 *
 *   get button() {
 *     return this.updateComplete.then(
 *       () => this.renderRoot.querySelector('#myButton'));
 *   }
 */
class QueryAsyncVisitor {
    constructor({ factory }) {
        this.kind = 'memberDecorator';
        this.decoratorName = 'queryAsync';
        this._factory = factory;
    }
    visit(litClassContext, property, decorator) {
        if (!typescript_1.default.isPropertyDeclaration(property)) {
            return;
        }
        if (!typescript_1.default.isCallExpression(decorator.expression)) {
            return;
        }
        if (!typescript_1.default.isIdentifier(property.name)) {
            return;
        }
        const name = property.name.text;
        const [arg0] = decorator.expression.arguments;
        if (arg0 === undefined || !typescript_1.default.isStringLiteral(arg0)) {
            return;
        }
        const selector = arg0.text;
        litClassContext.litFileContext.replaceAndMoveComments(property, this._createQueryAsyncGetter(name, selector));
    }
    _createQueryAsyncGetter(name, selector) {
        const factory = this._factory;
        return factory.createGetAccessorDeclaration(undefined, factory.createIdentifier(name), [], undefined, factory.createBlock([
            factory.createReturnStatement(factory.createCallExpression(factory.createPropertyAccessExpression(factory.createPropertyAccessExpression(factory.createThis(), factory.createIdentifier('updateComplete')), factory.createIdentifier('then')), undefined, [
                factory.createArrowFunction(undefined, undefined, [], undefined, factory.createToken(typescript_1.default.SyntaxKind.EqualsGreaterThanToken), factory.createCallExpression(factory.createPropertyAccessExpression(factory.createPropertyAccessExpression(factory.createThis(), factory.createIdentifier('renderRoot')), factory.createIdentifier('querySelector')), undefined, [factory.createStringLiteral(selector)])),
            ])),
        ], true));
    }
}
exports.QueryAsyncVisitor = QueryAsyncVisitor;
//# sourceMappingURL=query-async.js.map