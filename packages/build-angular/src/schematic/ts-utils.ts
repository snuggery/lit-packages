import ts from 'typescript';

export function isReadonly(symbol: ts.Symbol) {
	return (
		symbol.getJsDocTags().some(tag => tag.name === 'readonly') ||
		!!symbol.valueDeclaration?.modifiers?.some(
			modifier => modifier.kind === ts.SyntaxKind.ReadonlyKeyword,
		)
	);
}

export function isGetterOnly(symbol: ts.Symbol) {
	return !!(
		symbol.flags & ts.SymbolFlags.GetAccessor &&
		!(symbol.flags & ts.SymbolFlags.SetAccessor)
	);
}
