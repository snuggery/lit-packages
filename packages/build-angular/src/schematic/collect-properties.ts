import ts from 'typescript';

import {isExcluded as isExcludedForHtml} from './collector/html.js';
import {isExcluded as isExcludedForLit} from './collector/lit.js';
import {isExcluded as isNotPublic} from './collector/public-only.js';

function isIncluded(property: ts.Symbol, type: ts.InterfaceType) {
	return (
		!isNotPublic(property) &&
		!isExcludedForHtml(property, type) &&
		!isExcludedForLit(property, type)
	);
}

function isMethod(property: ts.Symbol) {
	return (
		property.getJsDocTags().find(tag => tag.name === 'method') != null ||
		(property.valueDeclaration &&
			ts.isMethodDeclaration(property.valueDeclaration))
	);
}

export function collectProperties(type: ts.InterfaceType) {
	const properties: ts.Symbol[] = [];
	const methods: ts.Symbol[] = [];

	for (const property of type.getProperties()) {
		if (isIncluded(property, type)) {
			if (isMethod(property)) {
				methods.push(property);
			} else {
				properties.push(property);
			}
		}
	}

	return {properties, methods};
}
