import type {
  APIResponse,
  CrateResponse,
  GithubDataResponse,
  GolangResponse,
  MasonPackageInfo,
  NpmDataResponse,
  PackageInfo,
  PyPiResponse,
} from "./../types";
import { SourceType } from "./../types";

import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";

const getApiURL = (sourceId: string): string | null => {
  let apiURL: string | null = null;
  // New format: provider:package-id (e.g., "github:owner/repo", "npm:package-name")
  const parts = sourceId.split(":");
  if (parts.length < 2) {
    return null;
  }
  const provider = parts[0];
  const packageId = parts.slice(1).join(":"); // In case there are colons in the package ID

  switch (provider) {
    case SourceType.GITHUB:
      apiURL = `https://api.github.com/repos/${packageId}/releases/latest`;
      break;
    case SourceType.NPM:
      apiURL = `https://registry.npmjs.org/${packageId}/latest`;
      break;
    case SourceType.PYPI:
      apiURL = `https://pypi.org/pypi/${packageId}/json`;
      break;
    case SourceType.GOLANG:
      apiURL = `https://proxy.golang.org/${packageId}/@latest`;
      break;
    case SourceType.CARGO:
      apiURL = `https://crates.io/api/v1/crates/${packageId}`;
      break;
    default:
      break;
  }
  return apiURL;
};

const getConfig = (sourceId: string): RequestInit | null => {
  let config = null;
  const parts = sourceId.split(":");
  if (parts.length < 2) {
    return null;
  }
  const provider = parts[0];

  switch (provider) {
    case SourceType.GITHUB:
      config = {
        headers: {
          Accept: "application/vnd.github.v3+json",
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        },
      };
      break;
    case SourceType.NPM:
      config = {};
      break;
    case SourceType.PYPI:
      config = {};
      break;
    case SourceType.GOLANG:
      config = {};
      break;
    case SourceType.CARGO:
      config = {};
      break;
    default:
      break;
  }
  return config;
};

const getDataFromApi = async (
  sourceId: string,
): APIResponse => {
  const apiURL = getApiURL(sourceId);
  if (!apiURL) {
    return null;
  }
  const config = getConfig(sourceId);
  if (!config) {
    return null;
  }
  try {
    const response = await fetch(apiURL, config);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Failed to fetch data from ${apiURL}`, error);
    return null;
  }
};

const getLatestVersion = async (sourceId: string): Promise<string | null> => {
  let data = null;
  let version = null;
  const parts = sourceId.split(":");
  if (parts.length < 2) {
    return null;
  }
  const provider = parts[0];

  switch (provider) {
    case SourceType.GITHUB:
      data = (await getDataFromApi(sourceId)) as GithubDataResponse | null;
      if (data && data.tag_name) version = data.tag_name;
      break;
    case SourceType.NPM:
      data = (await getDataFromApi(sourceId)) as NpmDataResponse | null;
      if (data && data.version) version = data.version;
      break;
    case SourceType.PYPI:
      data = (await getDataFromApi(sourceId)) as PyPiResponse | null;
      if (data && data.info && data.info.version) {
        version = data.info.version;
      }
      break;
    case SourceType.GOLANG:
      data = (await getDataFromApi(sourceId)) as GolangResponse | null;
      if (data && data.Version) version = data.Version;
      break;
    case SourceType.CARGO:
      data = (await getDataFromApi(sourceId)) as CrateResponse | null;
      if (data && data.crate && data.crate.max_stable_version) {
        version = data.crate.max_stable_version;
      }
      break;
    default:
      break;
  }
  return version;
};

// Convert package ID from new format to old Mason format
// "provider:package-id" -> "pkg:provider/package-id"
// Also handles URL encoding of @ symbols for npm scoped packages
const convertToMasonFormat = (newFormatId: string): string => {
  const parts = newFormatId.split(":");
  if (parts.length < 2) {
    return newFormatId; // Invalid format, return as-is
  }
  const provider = parts[0];
  const packageId = parts.slice(1).join(":"); // In case there are colons in the package ID

  // URL encode @ symbols for npm scoped packages (Mason compatibility)
  const encodedPackageId = packageId.replace("@", "%40");

  return `pkg:${provider}/${encodedPackageId}`;
};

// Recursively find all zana.yaml files in the packages directory
const findPackageFiles = (dir: string): string[] => {
  const packageFiles: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Recursively search subdirectories
      packageFiles.push(...findPackageFiles(fullPath));
    } else if (entry.isFile() && entry.name === "zana.yaml") {
      packageFiles.push(fullPath);
    }
  }

  return packageFiles;
};

const packagesDir = path.join(__dirname, "..", "..", "packages");
const masonRegistry: MasonPackageInfo[] = [];
const registry: PackageInfo[] = [];

const packageFiles = findPackageFiles(packagesDir);
const counter = {
  success: 0,
  failure: 0,
};

for (const packageYamlPath of packageFiles) {
  const fileContents = fs.readFileSync(packageYamlPath, "utf8");
  let packageData: PackageInfo;
  try {
    // INFO:
    // load all documents in the YAML file,
    // because js-yaml requires it even for single-document files
    // when it sees the document separator '---'
    const yamlDocuments = yaml.loadAll(fileContents) as PackageInfo[];
    // we expect only one document per file, so take the first one
    // if there are multiple documents, ignore the rest
    packageData = yamlDocuments[0];
    // validate that packageData is not null or undefined
    if (!packageData) {
      counter.failure++;
      console.error(
        "No valid YAML document found for package: ",
        packageYamlPath,
        { yamlDocuments },
      );
      continue;
    }
  } catch (e) {
    console.error(`Failed to parse YAML for ${packageYamlPath}:`, e);
    counter.failure++;
    continue;
  }
  // Convert to Mason format for compatibility
  // New format: provider:package-id -> Old format: pkg:provider/package-id
  const masonPackageData = structuredClone(packageData) as MasonPackageInfo;
  const masonSourceId = convertToMasonFormat(packageData.source.id);

  if (getApiURL(packageData.source.id) === null) {
    // not supported, but not an error
    continue;
  }
  const version = await getLatestVersion(packageData.source.id);
  if (version) {
    packageData.version = version;
    // Add version to Mason format: pkg:provider/package-id@version
    masonPackageData.source.id = `${masonSourceId}@${version}`;
    registry.push(packageData);
    masonRegistry.push(masonPackageData);
    counter.success++;
  } else {
    console.error(`Failed to get latest version for ${packageData.name}`);
    counter.failure++;
  }
}

const registryJsonPath = path.join(__dirname, "..", "..", "zana-registry.json");
const masonRegistryJsonPath = path.join(__dirname, "..", "..", "registry.json");
fs.writeFileSync(registryJsonPath, JSON.stringify(registry, null, 2));
fs.writeFileSync(masonRegistryJsonPath, JSON.stringify(masonRegistry, null, 2));

console.log(
  `Registry files created at ${registryJsonPath} and ${masonRegistryJsonPath}`,
);

console.log(`Success: ${counter.success}`);
console.log(`Failure: ${counter.failure}`);
console.log(`Total: ${counter.success + counter.failure}`);
