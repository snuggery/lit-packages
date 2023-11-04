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
exports.removeDecorators = exports.getHeritage = exports.isStatic = void 0;
const typescript_1 = __importDefault(require("typescript"));
/**
 * Return whether the given node has the static keyword modifier.
 */
const isStatic = (node) => typescript_1.default.canHaveModifiers(node) &&
    node.modifiers?.find((modifier) => modifier.kind === typescript_1.default.SyntaxKind.StaticKeyword) !== undefined;
exports.isStatic = isStatic;
/**
 * Return each class declaration in the given nodes lineage, including the given
 * node. Use the given type checker for resolving parent class names.
 */
function* getHeritage(node, checker) {
    yield node;
    const parentTypedExpression = getSuperClassTypeExpression(node);
    if (parentTypedExpression === undefined) {
        // No more inheritance.
        return;
    }
    const parentExpression = parentTypedExpression.expression;
    if (!typescript_1.default.isIdentifier(parentExpression)) {
        // We do not yet support non-identifier expressions in the extends clause.
        return;
    }
    const parentTypeSymbol = checker.getTypeFromTypeNode(parentTypedExpression).symbol;
    if (parentTypeSymbol === undefined ||
        parentTypeSymbol.declarations === undefined) {
        // Can't resolve symbol for parent type because we don't have access to its
        // source file.
        return;
    }
    const parentDeclaration = parentTypeSymbol
        .declarations[0];
    yield* getHeritage(parentDeclaration, checker);
}
exports.getHeritage = getHeritage;
/**
 * Get the type node for the superclass of the given class declaration.
 */
function getSuperClassTypeExpression(classDeclaration) {
    if (classDeclaration.heritageClauses === undefined) {
        return;
    }
    const extendsClause = classDeclaration.heritageClauses.find((clause) => clause.token === typescript_1.default.SyntaxKind.ExtendsKeyword);
    if (extendsClause === undefined) {
        return;
    }
    // Classes can only extend a single expression, so it is safe to get the first
    // type.
    const parentExpression = extendsClause.types[0];
    return parentExpression;
}
function removeDecorators(factory, modifiers) {
    if (modifiers === undefined) {
        return undefined;
    }
    return factory.createNodeArray(modifiers.filter((mod) => !typescript_1.default.isDecorator(mod)));
}
exports.removeDecorators = removeDecorators;
//# sourceMappingURL=util.js.map