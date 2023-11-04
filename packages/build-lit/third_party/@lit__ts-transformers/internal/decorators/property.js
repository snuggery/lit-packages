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
exports.PropertyVisitor = void 0;
const typescript_1 = __importDefault(require("typescript"));
const preserve_blank_lines_js_1 = require("../../preserve-blank-lines.js");
const util_js_1 = require("../util.js");
/**
 * Copies the comments and, optionally, leading blank lines from one node to
 * another.
 *
 * @param fromNode Node from which to copy comments.
 * @param toNode Node where comments should be copied to.
 * @param blankLines (Default: false) Whether to preserve leading blank lines.
 *   Useful for classmembers not moved to the constructor.
 */
const copyComments = (fromNode, toNode, blankLines = false) => {
    // Omit blank lines from the PreserveBlankLines transformer, because they
    // usually look awkward in the constructor.
    const nonBlankLineSyntheticComments = typescript_1.default
        .getSyntheticLeadingComments(fromNode)
        ?.filter((comment) => blankLines || comment.text !== preserve_blank_lines_js_1.BLANK_LINE_PLACEHOLDER_COMMENT);
    typescript_1.default.setSyntheticLeadingComments(toNode, nonBlankLineSyntheticComments);
};
/**
 * Transform:
 *
 *   @property({type: Number})
 *   foo = 123;
 *
 * Into:
 *
 *   static get properties() {
 *     return {
 *       foo: {type: Number}
 *     }
 *   }
 *
 *   constructor() {
 *     super(...arguments);
 *     this.foo = 123;
 *   }
 */
class PropertyVisitor {
    constructor({ factory }) {
        this.kind = 'memberDecorator';
        this.decoratorName = 'property';
        this._factory = factory;
    }
    visit(litClassContext, propertyOrGetter, decorator) {
        const isGetter = typescript_1.default.isGetAccessor(propertyOrGetter);
        if (!typescript_1.default.isPropertyDeclaration(propertyOrGetter) && !isGetter) {
            return;
        }
        if (!typescript_1.default.isIdentifier(propertyOrGetter.name)) {
            return;
        }
        if (!typescript_1.default.isCallExpression(decorator.expression)) {
            return;
        }
        const [arg0] = decorator.expression.arguments;
        if (!(arg0 === undefined || typescript_1.default.isObjectLiteralExpression(arg0))) {
            return;
        }
        const options = this._augmentOptions(arg0);
        const name = propertyOrGetter.name.text;
        const factory = this._factory;
        if (isGetter) {
            // Decorators is readonly so clone the property.
            const getterWithoutDecorators = factory.createGetAccessorDeclaration((0, util_js_1.removeDecorators)(factory, propertyOrGetter.modifiers), propertyOrGetter.name, propertyOrGetter.parameters, propertyOrGetter.type, propertyOrGetter.body);
            copyComments(propertyOrGetter, getterWithoutDecorators, true);
            litClassContext.litFileContext.nodeReplacements.set(propertyOrGetter, getterWithoutDecorators);
        }
        else {
            // Delete the member property
            litClassContext.litFileContext.nodeReplacements.set(propertyOrGetter, undefined);
        }
        litClassContext.reactiveProperties.push({ name, options });
        if (!isGetter && propertyOrGetter.initializer !== undefined) {
            const initializer = factory.createExpressionStatement(factory.createBinaryExpression(factory.createPropertyAccessExpression(factory.createThis(), factory.createIdentifier(name)), factory.createToken(typescript_1.default.SyntaxKind.EqualsToken), propertyOrGetter.initializer));
            typescript_1.default.setTextRange(initializer, propertyOrGetter);
            copyComments(propertyOrGetter, initializer);
            litClassContext.extraConstructorStatements.push(initializer);
        }
    }
    _augmentOptions(options) {
        return options;
    }
}
exports.PropertyVisitor = PropertyVisitor;
//# sourceMappingURL=property.js.map