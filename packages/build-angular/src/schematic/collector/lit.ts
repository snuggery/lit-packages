import type ts from 'typescript';

import {getAllSuperTypes, isPropertyOfType} from './utils.js';

let litElementType: ts.InterfaceType;

function extendsLitElement(classType: ts.InterfaceType) {
	const superTypes = getAllSuperTypes(classType);

	if (!litElementType) {
		for (const sc of superTypes) {
			if (
				sc.symbol.escapedName === 'LitElement' &&
				sc.symbol.valueDeclaration
					?.getSourceFile()
					.fileName.includes('/lit-element/')
			) {
				litElementType = sc;
			}
		}
	}

	return litElementType && superTypes.has(litElementType);
}

const litExcludedProperties = new Set([
	'render',
	'renderRoot',
	'createRenderRoot',
]);

export function isExcluded(property: ts.Symbol, classType: ts.InterfaceType) {
	if (!extendsLitElement(classType)) {
		return false;
	}

	// Exclude
	return (
		litExcludedProperties.has(property.getName()) ||
		isPropertyOfType(property, litElementType)
	);
}
