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
}
