import ts from 'typescript';

export function findClass(
	program: ts.Program,
	node: ts.Node,
): ts.InterfaceType {
	let type: ts.Type;
	const typeChecker = program.getTypeChecker();

	if (ts.isClassDeclaration(node)) {
		type = typeChecker.getTypeAtLocation(node);
	} else {
		const symbol = typeChecker.getSymbolAtLocation(node);

		if (symbol?.valueDeclaration == null) {
			throw new Error(`Failed to find class at ${symbol?.getName()}`);
		}

		type = typeChecker.getTypeAtLocation(symbol.valueDeclaration);
	}

	if (!type.isClass()) {
		throw new Error(`Failed to find class`);
	}

	return type;
}
