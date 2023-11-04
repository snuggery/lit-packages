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
exports.QueryAllVisitor = void 0;
const typescript_1 = __importDefault(require("typescript"));
/**
 * Transform:
 *
 *   @queryAll('.myInput')
 *   inputs
 *
 * Into:
 *
 *   get inputs() {
 *     return this.renderRoot?.queryAll('.myInput') ?? [];
 *   }
 */
class QueryAllVisitor {
    constructor({ factory }) {
        this.kind = 'memberDecorator';
        this.decoratorName = 'queryAll';
        this._factory = factory;
    }
    visit(litClassContext, property, decorator) {
        if (!typescript_1.default.isPropertyDeclaration(property)) {
            return;
        }
        if (!typescript_1.default.isCallExpression(decorator.expression)) {
            return;
        }
        const [arg0] = decorator.expression.arguments;
        if (arg0 === undefined || !typescript_1.default.isStringLiteral(arg0)) {
            return;
        }
        if (!typescript_1.default.isIdentifier(property.name)) {
            return;
        }
        const name = property.name.text;
        const selector = arg0.text;
        litClassContext.litFileContext.replaceAndMoveComments(property, this._createQueryAllGetter(name, selector));
    }
    _createQueryAllGetter(name, selector) {
        const factory = this._factory;
        return factory.createGetAccessorDeclaration(undefined, factory.createIdentifier(name), [], undefined, factory.createBlock([
            factory.createReturnStatement(factory.createBinaryExpression(factory.createCallChain(factory.createPropertyAccessChain(factory.createPropertyAccessExpression(factory.createThis(), factory.createIdentifier('renderRoot')), factory.createToken(typescript_1.default.SyntaxKind.QuestionDotToken), factory.createIdentifier('querySelectorAll')), undefined, undefined, [factory.createStringLiteral(selector)]), factory.createToken(typescript_1.default.SyntaxKind.QuestionQuestionToken), factory.createArrayLiteralExpression([], false))),
        ], true));
    }
}
exports.QueryAllVisitor = QueryAllVisitor;
//# sourceMappingURL=query-all.js.map