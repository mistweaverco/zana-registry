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
			grammar_dir: string;
			/** Base grammar language names for query inheritance (e.g. javascript for typescript). */
			inherits?: string[];
		}[];
	};
}

export enum PackageTreesitterIntegration {
	None = 'none',
	Neovim = 'neovim'
}
