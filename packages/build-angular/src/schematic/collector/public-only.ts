import ts from 'typescript';

export function isExcluded(property: ts.Symbol) {
	const jsdocTags = new Set(property.getJsDocTags().map(tag => tag.name));
	if (
		// Properties typescript explicitly supports
		jsdocTags.has('private') ||
		jsdocTags.has('protected') ||
		// Extra widely used properties
		jsdocTags.has('internal') ||
		jsdocTags.has('docs-internal') ||
		// And one extra property specifically for this program
		jsdocTags.has('ng-hidden')
	) {
		return true;
	}

	const decl = property.valueDeclaration;
	if (
		decl != null &&
		(ts.isPropertyDeclaration(decl) || ts.isMethodDeclaration(decl))
	) {
		if (ts.isPrivateIdentifier(decl.name)) {
			return true;
		}

		const modifiers = new Set(decl.modifiers?.map(mod => mod.kind));
		if (
			modifiers.has(ts.SyntaxKind.ProtectedKeyword) ||
			modifiers.has(ts.SyntaxKind.PrivateKeyword)
		) {
			return true;
		}
	}

	return false;
}
