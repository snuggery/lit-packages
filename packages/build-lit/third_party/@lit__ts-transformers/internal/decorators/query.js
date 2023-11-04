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
exports.QueryVisitor = void 0;
const typescript_1 = __importDefault(require("typescript"));
/**
 * Transform:
 *
 *   @query('#myDiv')
 *   div
 *
 *   @query('#mySpan', true)
 *   span
 *
 * Into:
 *
 *   get div() {
 *     return this.renderRoot?.querySelector('#myDiv');
 *   }
 *
 *   get span() {
 *     return this.__span ??= this.renderRoot?.querySelector('#myDiv') ?? null;
 *   }
 */
class QueryVisitor {
    constructor({ factory }) {
        this.kind = 'memberDecorator';
        this.decoratorName = 'query';
        this._factory = factory;
    }
    visit(litClassContext, property, decorator) {
        if (!typescript_1.default.isPropertyDeclaration(property)) {
            return;
        }
        if (!typescript_1.default.isCallExpression(decorator.expression)) {
            return;
        }
        const [arg0, arg1] = decorator.expression.arguments;
        if (arg0 === undefined || !typescript_1.default.isStringLiteral(arg0)) {
            return;
        }
        if (!typescript_1.default.isIdentifier(property.name)) {
            return;
        }
        const name = property.name.text;
        const selector = arg0.text;
        const cache = arg1?.kind === typescript_1.default.SyntaxKind.TrueKeyword;
        litClassContext.litFileContext.replaceAndMoveComments(property, this._createQueryGetter(name, selector, cache));
    }
    _createQueryGetter(name, selector, cache) {
        const factory = this._factory;
        const querySelectorCall = factory.createBinaryExpression(factory.createCallChain(factory.createPropertyAccessChain(factory.createPropertyAccessExpression(factory.createThis(), factory.createIdentifier('renderRoot')), factory.createToken(typescript_1.default.SyntaxKind.QuestionDotToken), factory.createIdentifier('querySelector')), undefined, undefined, [factory.createStringLiteral(selector)]), factory.createToken(typescript_1.default.SyntaxKind.QuestionQuestionToken), factory.createNull());
        return factory.createGetAccessorDeclaration(undefined, factory.createIdentifier(name), [], undefined, factory.createBlock([
            factory.createReturnStatement(cache
                ? factory.createBinaryExpression(factory.createPropertyAccessExpression(factory.createThis(), factory.createIdentifier(`__${name}`)), typescript_1.default.SyntaxKind.QuestionQuestionEqualsToken, querySelectorCall)
                : querySelectorCall),
        ], true));
    }
}
exports.QueryVisitor = QueryVisitor;
//# sourceMappingURL=query.js.map