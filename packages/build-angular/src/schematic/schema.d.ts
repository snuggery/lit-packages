export interface Schema {
	project?: string;

	angularProjectName?: string;

	include?: string | string[];

	exclude?: string | string[];

	outputDirectory?: string;
}
