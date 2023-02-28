export interface Schema {
	tsconfig?: string;

	inputFiles?: string[];

	karmaConfig: string;

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

	conditions?: string[];

	watch?: boolean;
}
