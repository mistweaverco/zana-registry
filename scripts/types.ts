import { type ErrorObject } from "ajv";

export type GithubDataResponse = {
  tag_name: string;
};

export type NpmDataResponse = {
  version: string;
};

export type PyPiResponse = {
  info: {
    version: string;
  };
};

export type GolangResponse = {
  Version: string;
};

export type CrateResponse = {
  crate: {
    max_stable_version: string;
  };
};

export interface MasonPackageInfo {
  name: string;
  description: string;
  homepage: string;
  licenses: string[];
  languages: string[];
  categories: string[];
  source: {
    id: string;
  };
  bin: Record<string, string>;
}

export type APIResponse = Promise<
  | GithubDataResponse
  | NpmDataResponse
  | PyPiResponse
  | GolangResponse
  | CrateResponse
  | null
>;

export interface PackageInfo {
  name: string;
  version: string;
  description: string;
  homepage: string;
  licenses: string[];
  languages: string[];
  categories: string[];
  experimental?: boolean;
  aliases?: string[];
  source: {
    id: string;
  };
  bin: Record<string, string>;
}

export interface PackageInfoWithValidationErrorsSupport extends PackageInfo {
  validationErrors?: ErrorObject[];
}

export type SchemaErrors = {
  name: string;
  errors: ErrorObject[];
};

export enum SourceType {
  GITHUB = "github",
  NPM = "npm",
  PYPI = "pypi",
  GOLANG = "golang",
  CARGO = "cargo",
}
