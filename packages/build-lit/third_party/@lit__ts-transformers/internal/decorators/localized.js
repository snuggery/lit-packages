"use strict";
/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalizedVisitor = void 0;
/**
 * Transform:
 *
 *   import {localized} from '@lit/localize';
 *
 *   @localized()
 *   class MyElement extends LitElement {}
 *
 * Into:
 *
 *   import {updateWhenLocaleChanges} from '@lit/localize';
 *
 *   class MyElement extends LitElement {
 *     constructor() {
 *       super(...arguments);
 *       updateWhenLocaleChanges(this);
 *     }
 *   }
 */
class LocalizedVisitor {
    constructor({ factory }) {
        this.kind = 'classDecorator';
        this.decoratorName = 'localized';
        this.importBindingReplacement = 'updateWhenLocaleChanges';
        this._factory = factory;
    }
    visit(litClassContext, decorator) {
        litClassContext.litFileContext.nodeReplacements.set(decorator, undefined);
        const factory = this._factory;
        const updateCall = factory.createExpressionStatement(factory.createCallExpression(factory.createIdentifier(this.importBindingReplacement), undefined, [factory.createThis()]));
        litClassContext.extraConstructorStatements.push(updateCall);
    }
}
exports.LocalizedVisitor = LocalizedVisitor;
//# sourceMappingURL=localized.js.map