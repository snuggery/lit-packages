import {join, normalize, relative} from '@angular-devkit/core';
import type {Tree} from '@angular-devkit/schematics';
import {virtualFileSystemFolder} from '@snuggery/schematics';
import type ts from 'typescript';

import {isReadonly, isGetterOnly} from './ts-utils.js';

function toLowerCamelCase(str: string) {
	return str
		.replace(/([a-z])([A-Z])/, '$1-$2')
		.toLowerCase()
		.replace(/[-_](.)/g, (_, l) => l.toUpperCase());
}

function toUpperCamelCase(str: string) {
	const lcc = toLowerCamelCase(str);

	return lcc[0]!.toUpperCase() + lcc.slice(1);
}

const empty: never[] = [];

export function write(
	tree: Tree,
	name: string,
	outDir: string,
	{
		classNode,
		properties,
		methods,
		events,
	}: {
		classNode: ts.ClassDeclaration;
		properties: ts.Symbol[];
		methods: ts.Symbol[];
		events: {
			eventName: string;
			eventTypeName: string;
			eventTypeLocation: string | null;
		}[];
	},
) {
	const sourceFile = classNode.getSourceFile().fileName;
	const outFile = join(normalize(outDir), `${name}.component.ts`);

	function makeRelative(mod: string) {
		const r = relative(normalize(outDir), normalize(mod));
		return /^\.\.?\//.test(r) ? r : `./${r}`;
	}

	const imports = new Map([
		[
			'@angular/core',
			new Set(['Component', 'ChangeDetectionStrategy', 'ViewEncapsulation']),
		],
	]);
	function getImports(name: string) {
		let importsForPackage = imports.get(name);
		if (importsForPackage == null) {
			importsForPackage = new Set();
			imports.set(name, importsForPackage);
		}
		return importsForPackage;
	}

	function getImportPath(module: string) {
		module = module.replace(/\.[cm]?tsx?$/, '');

		if (module.startsWith(virtualFileSystemFolder)) {
			module = module.slice(virtualFileSystemFolder.length);
		}

		const relative = makeRelative(module);
		return (
			/\/node_modules\/((?:@[a-zA-Z0-9_-]+\/)?[a-zA-Z0-9_-]+(?!.*\/node_modules\/)(?:\/.*|$))/.exec(
				relative,
			)?.[1] ?? relative
		);
	}

	function ensureImported(module: string, name: string) {
		getImports(getImportPath(module)).add(name);
	}

	function isImportedFromPackage(pkg: string, name: string) {
		return getImports(pkg).has(name);
	}

	function ensureImportedFromPackage(pkg: string, name: string) {
		getImports(pkg).add(name);
	}

	if (
		properties.some(
			property => !isReadonly(property) && !isGetterOnly(property),
		)
	) {
		ensureImportedFromPackage('@angular/core', 'ElementRef');
		ensureImportedFromPackage('@angular/core', 'ChangeDetectorRef');

		ensureImportedFromPackage('@angular/core', 'Input');
		ensureImportedFromPackage('@angular/core', 'NgZone');
	}
	if (methods.length) {
		ensureImportedFromPackage('@angular/core', 'ElementRef');
		ensureImportedFromPackage('@angular/core', 'ChangeDetectorRef');

		ensureImportedFromPackage('@angular/core', 'NgZone');
	}
	if (events.length) {
		ensureImportedFromPackage('@angular/core', 'ElementRef');
		ensureImportedFromPackage('@angular/core', 'ChangeDetectorRef');

		ensureImportedFromPackage('@angular/core', 'Output');
		ensureImportedFromPackage('rxjs', 'fromEvent');
		ensureImportedFromPackage('rxjs', 'Observable');
	}

	if (getImports('@angular/core').has('ElementRef')) {
		ensureImported(sourceFile, classNode.name!.text);
	}

	for (const {eventTypeLocation, eventTypeName} of events) {
		if (eventTypeLocation != null) {
			ensureImported(eventTypeLocation, eventTypeName);
		}
	}

	const lines = Array.from(
		imports,
		([pkg, imps]) =>
			`${
				pkg === 'rxjs' || pkg === '@angular/core' ? 'import' : 'import type'
			} {${Array.from(imps).join(', ')}} from ${JSON.stringify(pkg)};`,
	);

	lines.push(``, `import ${JSON.stringify(getImportPath(sourceFile))}`);

	lines.push(
		``,
		`@Component({`,
		`  standalone: true,`,
		`  selector: '${name}',`,
		`  template: '<ng-content></ng-content>',`,
		`  changeDetection: ChangeDetectionStrategy.OnPush,`,
		`  encapsulation: ViewEncapsulation.None,`,
		`})`,
		`export class ${toUpperCamelCase(name)}Component {`,
	);

	if (isImportedFromPackage('@angular/core', 'ElementRef')) {
		lines.push(`  private _e: ${classNode.name!.text};`, ``);
	}

	for (const {eventName, eventTypeName} of events) {
		lines.push(
			`  @Output(${JSON.stringify(eventName)})`,
			`  readonly _event_${toLowerCamelCase(
				eventName,
			)}: Observable<${eventTypeName}>;`,
			``,
		);
	}

	const ctorParameters = [
		isImportedFromPackage('@angular/core', 'ElementRef')
			? `{nativeElement: _e}: ElementRef<${classNode.name!.text}>`
			: empty,
		isImportedFromPackage('@angular/core', 'NgZone')
			? 'private readonly _z: NgZone'
			: empty,
		isImportedFromPackage('@angular/core', 'ChangeDetectorRef')
			? 'c: ChangeDetectorRef'
			: empty,
	].flat();

	if (ctorParameters.length) {
		lines.push(`  constructor(${ctorParameters.join(', ')}) {`);

		if (isImportedFromPackage('@angular/core', 'ElementRef')) {
			lines.push(`    this._e = _e;`);
		}
		if (isImportedFromPackage('@angular/core', 'ChangeDetectorRef')) {
			lines.push(`    c.detach();`);
		}

		if (events.length) {
			lines.push(
				``,
				...events.map(
					({eventName, eventTypeName}) =>
						`    this._event_${toLowerCamelCase(
							eventName,
						)} = fromEvent<${eventTypeName}>(_e, ${JSON.stringify(
							eventName,
						)});`,
				),
			);
		}

		lines.push(`  }`);
	}

	for (const prop of properties) {
		const name = prop.getName();
		const type = `${classNode.name!.text}[${JSON.stringify(name)}]`;

		if (!isReadonly(prop) && !isGetterOnly(prop)) {
			lines.push(
				``,
				`  @Input()`,
				`  set ${name}(val: ${type}) {`,
				`    this._z.runOutsideAngular(() => {`,
				`      this._e.${name} = val;`,
				`    });`,
				`  }`,
			);
		}

		lines.push(
			``,
			`  get ${name}(): ${type} {`,
			`    return this._e.${name};`,
			`  }`,
		);
	}

	for (const method of methods) {
		const name = method.getName();
		const type = `${classNode.name!.text}[${JSON.stringify(name)}]`;

		lines.push(
			``,
			`  ${name}(...args: Parameters<${type}>): ReturnType<${type}>;`,
			`  ${name}(): any {`,
			`    const args = arguments;`,
			`    return this._z.runOutsideAngular(() =>`,
			`      this._e.${name}.apply(this._e, args),`,
			`    );`,
			`  }`,
		);
	}

	lines.push('}', '');

	if (tree.exists(outFile)) {
		tree.overwrite(outFile, lines.join('\n'));
	} else {
		tree.create(outFile, lines.join('\n'));
	}
}
