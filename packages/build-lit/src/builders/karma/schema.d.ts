export interface Schema {
	tsconfig?: string;

	inputFiles?: string[];

	karmaConfig: string;

	banner?: {[type: string]: string};

	footer?: {[type: string]: string};

	inject?: string[];

	target?: string[];

	watch?: boolean;
}
