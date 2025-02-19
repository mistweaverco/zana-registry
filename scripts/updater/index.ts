import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";

enum SourceType {
  GITHUB = "pkg:github",
  NPM = "pkg:npm",
  PYPI = "pkg:pypi",
  GOLANG = "pkg:golang",
}

const getApiURL = (sourceId: string): string | null => {
  let apiURL: string | null = null;
  const repo = sourceId.split("/").slice(1).join("/");
  switch (true) {
    case sourceId.startsWith(SourceType.GITHUB):
      apiURL = `https://api.github.com/repos/${repo}/releases/latest`;
      break;
    case sourceId.startsWith(SourceType.NPM):
      apiURL = `https://registry.npmjs.org/${repo}/latest`;
      break;
    case sourceId.startsWith(SourceType.PYPI):
      apiURL = `https://pypi.org/pypi/${repo}/json`;
      break;
    case sourceId.startsWith(SourceType.GOLANG):
      apiURL = `https://proxy.golang.org/${repo}/@latest`;
      break;
    default:
      break;
  }
  return apiURL;
};

type GithubDataResponse = {
  tag_name: string;
};

type NpmDataResponse = {
  version: string;
};

type PyPiResponse = {
  info: {
    version: string;
  };
};

type GolangResponse = {
  Version: string;
};

const getConfig = (sourceId: string): RequestInit | null => {
  let config = null;
  switch (true) {
    case sourceId.startsWith(SourceType.GITHUB):
      config = {
        headers: {
          Accept: "application/vnd.github.v3+json",
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        },
      };
      break;
    case sourceId.startsWith(SourceType.NPM):
      config = {};
      break;
    case sourceId.startsWith(SourceType.PYPI):
      config = {};
      break;
    case sourceId.startsWith(SourceType.GOLANG):
      config = {};
      break;
    default:
      break;
  }
  return config;
};

const getDataFromApi = async (
  sourceId: string,
): Promise<
  GithubDataResponse | NpmDataResponse | PyPiResponse | GolangResponse | null
> => {
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

const stripVersionPrefix = (version: string): string => {
  return version.replace(/^v/, "");
};

const getLatestVersion = async (sourceId: string): Promise<string | null> => {
  let data = null;
  let version = null;
  switch (true) {
    case sourceId.startsWith(SourceType.GITHUB):
      data = (await getDataFromApi(sourceId)) as GithubDataResponse | null;
      if (data && data.tag_name) version = stripVersionPrefix(data.tag_name);
      break;
    case sourceId.startsWith(SourceType.NPM):
      data = (await getDataFromApi(sourceId)) as NpmDataResponse | null;
      if (data && data.version) version = stripVersionPrefix(data.version);
      break;
    case sourceId.startsWith(SourceType.PYPI):
      data = (await getDataFromApi(sourceId)) as PyPiResponse | null;
      if (data && data.info && data.info.version)
        version = stripVersionPrefix(data.info.version);
      break;
    case sourceId.startsWith(SourceType.GOLANG):
      data = (await getDataFromApi(sourceId)) as GolangResponse | null;
      if (data && data.Version) version = data.Version;
      break;
    default:
      break;
  }
  return version;
};

interface PackageInfo {
  name: string;
  version: string;
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

const packagesDir = path.join(__dirname, "..", "..", "packages");
const registry: PackageInfo[] = [];

const dirents = fs.readdirSync(packagesDir, { withFileTypes: true });
const counter = {
  success: 0,
  failure: 0,
};

for (const dirent of dirents) {
  if (dirent.isDirectory()) {
    const packageYamlPath = path.join(packagesDir, dirent.name, "zana.yaml");
    if (fs.existsSync(packageYamlPath)) {
      const fileContents = fs.readFileSync(packageYamlPath, "utf8");
      const packageData = yaml.load(fileContents) as PackageInfo;
      const version = await getLatestVersion(packageData.source.id);
      if (version) {
        packageData.version = version;
        registry.push(packageData);
        counter.success++;
      } else {
        console.error(`Failed to get latest version for ${packageData.name}`);
        counter.failure++;
      }
    }
  }
}

const registryJsonPath = path.join(__dirname, "..", "..", "registry.json");
fs.writeFileSync(registryJsonPath, JSON.stringify(registry, null, 2));

console.log(`Registry file created at ${registryJsonPath}`);
console.log(`Success: ${counter.success}`);
console.log(`Failure: ${counter.failure}`);
console.log(`Total: ${counter.success + counter.failure}`);
