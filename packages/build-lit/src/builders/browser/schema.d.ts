export interface Schema {
	entryPoints: string[] | {in: string; out: string}[] | {[out: string]: string};

	outdir?: string;

	outbase?: string;

	tsconfig?: string;

	banner?: {[type: string]: string};

	footer?: {[type: string]: string};

	inject?: string[];

	target?: string[];

	minify?: boolean;

	baseHref?: string | {[locale: string]: string};

	deployUrl?: string;

	localize?: string | string[];
}
