import type {AssetSpec} from '@snuggery/architect';

export interface Schema {
	assets?: AssetSpec[];

	clean?: boolean;

	manifest?: string;

	outdir?: string;

	tsconfig?: string | null;

	package?: boolean | null;

	packager?: string;

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

	metafile?: boolean;

	inlineLitDecorators?: boolean;
}
