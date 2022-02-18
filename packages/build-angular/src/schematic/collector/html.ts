import type ts from 'typescript';

import {getAllSuperTypes, isPropertyOfType} from './utils.js';

let htmlElementType: ts.InterfaceType;

function extendsHTMLElement(classType: ts.InterfaceType) {
	const superTypes = getAllSuperTypes(classType);

	if (!htmlElementType) {
		for (const sc of superTypes) {
			if (
				sc.symbol.escapedName === 'HTMLElement' &&
				sc.symbol.valueDeclaration
					?.getSourceFile()
					.fileName.endsWith('/lib.dom.d.ts')
			) {
				htmlElementType = sc;
			}
		}
	}

	return htmlElementType && superTypes.has(htmlElementType);
}

const htmlExcludedProperties = new Set([
	// https://html.spec.whatwg.org/multipage/custom-elements.html#concept-custom-element-definition-lifecycle-callbacks

	// custom element callbacks
	'connectedCallback',
	'disconnectedCallback',
	'adoptedCallback',
	'attributeChangedCallback',
	// form-associated custom element callback
	'formAssociatedCallback',
	'formDisabledCallback',
	'formResetCallback',
	'formStateRestoreCallback',
]);

export function isExcluded(property: ts.Symbol, classType: ts.InterfaceType) {
	if (!extendsHTMLElement(classType)) {
		return false;
	}

	// Exclude
	return (
		htmlExcludedProperties.has(property.getName()) ||
		isPropertyOfType(property, htmlElementType)
	);
}
