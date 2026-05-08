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
		}[];
	};
}

export enum PackageTreesitterIntegration {
	None = 'none',
	Neovim = 'neovim'
}
