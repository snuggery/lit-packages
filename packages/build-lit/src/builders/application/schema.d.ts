export interface Schema {
	entryPoints: string[] | {in: string; out: string}[] | {[out: string]: string};

	outdir?: string;

	outbase?: string;

	tsconfig?: string;

	banner?: {
		css?: string;
		js?: string;
	};

	footer?: {
		css?: string;
		js?: string;
	};

	inject?: string[];

	target?: string | string[];

	minify?: boolean;

	baseHref?: string | {[locale: string]: string};

	deployUrl?: string;

	localize?: string | string[];

	metafile?: boolean;

	conditions?: string[];

	inlineLitDecorators?: boolean;
}
