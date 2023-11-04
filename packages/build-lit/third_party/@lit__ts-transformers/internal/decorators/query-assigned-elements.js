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
exports.QueryAssignedElementsVisitor = void 0;
const typescript_1 = __importDefault(require("typescript"));
/**
 * Transform:
 *
 *   @queryAssignedElements({slot: 'list', selector: '.item'})
 *   listItems
 *
 * Into:
 *
 *   get listItems() {
 *     return this.renderRoot
 *       ?.querySelector('slot[name=list]')
 *       ?.assignedElements()
 *       ?.filter((node) => node.matches('.item')
 *   }
 */
class QueryAssignedElementsVisitor {
    constructor({ factory }) {
        this.kind = 'memberDecorator';
        this.decoratorName = 'queryAssignedElements';
        /**
         * The method used to query the HTMLSlot element.
         */
        this.slottedQuery = 'assignedElements';
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
        if (arg0 && !typescript_1.default.isObjectLiteralExpression(arg0)) {
            throw new Error(`${this.decoratorName} argument is expected to be an inlined ` +
                `object literal. Instead received: '${arg0.getText()}'`);
        }
        if (arg0 &&
            arg0.properties.some((p) => !(typescript_1.default.isPropertyAssignment(p) || typescript_1.default.isShorthandPropertyAssignment(p)))) {
            throw new Error(`${this.decoratorName} object literal argument can only include ` +
                `property assignment. For example: '{ slot: "example" }' is ` +
                `supported, whilst '{ ...otherOpts }' is unsupported.`);
        }
        const { slot, selector } = this._retrieveSlotAndSelector(arg0);
        litClassContext.litFileContext.replaceAndMoveComments(property, this._createQueryAssignedGetter({
            name,
            slot,
            selector,
            assignedElsOptions: this._filterAssignedOptions(arg0),
        }));
    }
    /**
     * @param opts object literal node passed into the queryAssignedElements decorator
     * @returns expression nodes for the slot and selector.
     */
    _retrieveSlotAndSelector(opts) {
        if (!opts) {
            return {};
        }
        const findExpressionFor = (key) => {
            const propAssignment = opts.properties.find((p) => p.name && typescript_1.default.isIdentifier(p.name) && p.name.text === key);
            if (!propAssignment) {
                return;
            }
            if (typescript_1.default.isPropertyAssignment(propAssignment)) {
                return propAssignment.initializer;
            }
            if (typescript_1.default.isShorthandPropertyAssignment(propAssignment)) {
                return propAssignment.name;
            }
            return;
        };
        return {
            slot: findExpressionFor('slot'),
            selector: findExpressionFor('selector'),
        };
    }
    /**
     * queryAssignedElements options contains a superset of the options that
     * `HTMLSlotElement.assignedElements` accepts. This method takes the original
     * optional options passed into `queryAssignedElements` and filters out any
     * decorator specific property assignments.
     *
     * Given:
     *
     * ```ts
     * { slot: 'example', flatten: false }
     * ```
     *
     * returns:
     *
     * ```ts
     * { flatten: false }
     * ```
     *
     * Returns `undefined` instead of an empty object literal if no property
     * assignments are left after filtering, such that we don't generate code
     * like `HTMLSlotElement.assignedElements({})`.
     */
    _filterAssignedOptions(opts) {
        if (!opts) {
            return;
        }
        const assignedElementsProperties = opts.properties.filter((p) => p.name &&
            typescript_1.default.isIdentifier(p.name) &&
            !['slot', 'selector'].includes(p.name.text));
        if (assignedElementsProperties.length === 0) {
            return;
        }
        return this._factory.updateObjectLiteralExpression(opts, assignedElementsProperties);
    }
    _createQueryAssignedGetter({ name, slot, selector, assignedElsOptions, }) {
        const factory = this._factory;
        const slotSelector = slot
            ? this.createNamedSlotSelector(slot)
            : this.createDefaultSlotSelector();
        const assignedElementsOptions = assignedElsOptions
            ? [assignedElsOptions]
            : [];
        // this.renderRoot?.querySelector(<selector>)?.assignedElements(<options>)
        const assignedElements = factory.createCallChain(factory.createPropertyAccessChain(factory.createCallChain(factory.createPropertyAccessChain(factory.createPropertyAccessExpression(factory.createThis(), factory.createIdentifier('renderRoot')), factory.createToken(typescript_1.default.SyntaxKind.QuestionDotToken), factory.createIdentifier('querySelector')), undefined, undefined, [slotSelector]), factory.createToken(typescript_1.default.SyntaxKind.QuestionDotToken), factory.createIdentifier(this.slottedQuery)), undefined, undefined, assignedElementsOptions);
        const returnExpression = !selector
            ? assignedElements
            : // <assignedElements>?.filter((node) => node.matches(<selector>))
                factory.createCallChain(factory.createPropertyAccessChain(assignedElements, factory.createToken(typescript_1.default.SyntaxKind.QuestionDotToken), factory.createIdentifier('filter')), undefined, undefined, [
                    factory.createArrowFunction(undefined, undefined, [
                        factory.createParameterDeclaration(undefined, undefined, factory.createIdentifier('node')),
                    ], undefined, factory.createToken(typescript_1.default.SyntaxKind.EqualsGreaterThanToken), this.getSelectorFilter(selector)),
                ]);
        // { return <returnExpression> }
        const getterBody = factory.createBlock([
            factory.createReturnStatement(factory.createBinaryExpression(returnExpression, factory.createToken(typescript_1.default.SyntaxKind.QuestionQuestionToken), factory.createArrayLiteralExpression([], false))),
        ], true);
        return factory.createGetAccessorDeclaration(undefined, factory.createIdentifier(name), [], undefined, getterBody);
    }
    /**
     * @param selector User supplied CSS selector.
     * @returns Expression used to filter the queried Elements.
     */
    getSelectorFilter(selector) {
        const factory = this._factory;
        return factory.createCallExpression(factory.createPropertyAccessExpression(factory.createIdentifier('node'), factory.createIdentifier('matches')), undefined, [selector]);
    }
    /**
     * Returns a template string which resolves the passed in slot name
     * expression.
     *
     * Special handling is included for string literals and no substitution
     * template literals. In this case we inline the slot name into the selector
     * to match what is more likely to have been authored.
     *
     * @param slot Expression that evaluates to the slot name.
     * @returns Template string node representing `slot[name=${slot}]` except when
     *   `slot` is a string literal. Then the literal is inlined. I.e. for a slot
     *   expression of `"list"`, return `slot[name=list]`.
     */
    createNamedSlotSelector(slot) {
        const factory = this._factory;
        if (typescript_1.default.isStringLiteral(slot) || typescript_1.default.isNoSubstitutionTemplateLiteral(slot)) {
            const inlinedSlotSelector = `slot[name=${slot.text}]`;
            return this._factory.createNoSubstitutionTemplateLiteral(inlinedSlotSelector, inlinedSlotSelector);
        }
        return factory.createTemplateExpression(factory.createTemplateHead('slot[name=', 'slot[name='), [factory.createTemplateSpan(slot, factory.createTemplateTail(']', ']'))]);
    }
    /**
     * @returns Template string node representing `slot:not([name])`
     */
    createDefaultSlotSelector() {
        return this._factory.createNoSubstitutionTemplateLiteral('slot:not([name])', 'slot:not([name])');
    }
}
exports.QueryAssignedElementsVisitor = QueryAssignedElementsVisitor;
//# sourceMappingURL=query-assigned-elements.js.map