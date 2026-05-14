export interface Package {
	name: string;
	source: {
		id: string;
	};
	description: string;
	version: string;
	homepage: string;
	licenses: string[];
	languages?: string[];
	tags?: string[];
	categories: string[];
	aliases?: string[];
	searchMatchInfo?: string;
	treesitter?: {
		build: {
			language: string;
			grammar_dir?: string;
			integrations?: string[];
			requires?: string[];
			/** Base grammar language names for query inheritance (e.g. javascript for typescript). */
			inherits?: string[];
			injections?: string[];
			queries_only?: boolean;
		}[];
	};
}

export enum PackageTreesitterIntegration {
	None = 'none',
	Neovim = 'neovim'
}
