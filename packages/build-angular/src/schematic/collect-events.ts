import ts from 'typescript';

export function collectEvents(
	sourceFile: ts.SourceFile,
	type: ts.InterfaceType,
	tc: ts.TypeChecker,
) {
	const events: {
		eventName: string;
		eventTypeName: string;
		eventTypeLocation: string | null;
	}[] = [];

	for (const tag of type.symbol.getJsDocTags()) {
		if (tag.name !== 'fires') {
			continue;
		}

		if (!tag.text?.length || tag.text[0]!.kind !== 'text') {
			console.warn(
				`Invalid @fires tag on ${type.symbol.name}: tag can't be empty`,
			);
			continue;
		}

		const match = /^\s*\{(?<eventType>.*?)\}\s*(?<eventName>\w+)\b/.exec(
			tag.text[0]!.text,
		);
		if (match == null) {
			console.warn(
				`Invalid @fires tag on ${type.symbol.name}: tag must match "{type} name doc..."`,
			);
			continue;
		}

		const {eventType, eventName} = match.groups as {
			eventType: string;
			eventName: string;
		};

		const allSymbols = tc.getSymbolsInScope(
			type.symbol.valueDeclaration!,
			ts.SymbolFlags.Class |
				ts.SymbolFlags.Interface |
				ts.SymbolFlags.Type |
				ts.SymbolFlags.Alias,
		);
		const eventTypeSymbol = allSymbols.find(
			symbol => symbol.name === eventType,
		);

		if (eventTypeSymbol == null) {
			console.warn(
				`Invalid @fires tag on ${type.symbol.name}: can't find event type`,
			);
			console.warn(
				"Only types are supported, e.g. {Event}, {CustomEvent}, or {MyOwnEvent}, but not {someNamespace.Event} or {import('other').Event}",
			);
			continue;
		}

		let eventTypeLocation: string | null = null;
		let eventTypeName: string;

		if (eventTypeSymbol.flags & ts.SymbolFlags.Alias) {
			// this is an imported type
			const resolvedSymbol = tc.getAliasedSymbol(eventTypeSymbol);
			eventTypeName = resolvedSymbol.name;

			const eventTypeSourceFile = (
				resolvedSymbol.valueDeclaration ?? resolvedSymbol.getDeclarations()![0]
			)?.getSourceFile().fileName;

			if (eventTypeSourceFile == null) {
				console.warn(
					`Failed to resolve {${eventType}} for element ${type.symbol.name}`,
				);
				continue;
			}

			eventTypeLocation = eventTypeSourceFile;
		} else {
			const eventTypeSourceFile = (
				eventTypeSymbol.valueDeclaration ??
				eventTypeSymbol.getDeclarations()![0]
			)?.getSourceFile().fileName;

			if (eventTypeSourceFile === sourceFile.fileName) {
				// Event type is declared in the same file
				eventTypeLocation = eventTypeSourceFile;
			} else {
				// Event is declared in a different file, but not imported... so it must be global
				eventTypeLocation = null;
			}

			eventTypeName = eventType!;
		}

		events.push({
			eventName,
			eventTypeLocation,
			eventTypeName,
		});
	}

	return events;
}
