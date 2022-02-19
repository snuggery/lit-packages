export interface Schema {
	project?: string;

	workspaceProjectName?: string;

	include?: string | string[];

	exclude?: string | string[];

	outputDirectory?: string;
}
