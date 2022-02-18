import type ts from 'typescript';

const superTypes = new Map<ts.InterfaceType, ReadonlySet<ts.InterfaceType>>();

export function getAllSuperTypes(classType: ts.InterfaceType) {
	let st = superTypes.get(classType);
	if (st != null) {
		return st;
	}

	st = new Set();
	const processed = new Set();

	function processSuperType(type: ts.Type) {
		if (processed.has(type)) {
			return;
		}
		processed.add(type);

		if (type.isIntersection()) {
			for (const subtype of type.types) {
				processSuperType(subtype);
			}
		} else if (type.isClassOrInterface()) {
			if (!st!.has(type)) {
				st = new Set([...st!, type, ...getAllSuperTypes(type)]);
			}
		}
	}

	for (const type of classType.getBaseTypes() || []) {
		processSuperType(type);
	}

	superTypes.set(classType, st);
	return st;
}

export function isPropertyOfType(property: ts.Symbol, type: ts.InterfaceType) {
	return type.getProperty(property.name) === property;
}
