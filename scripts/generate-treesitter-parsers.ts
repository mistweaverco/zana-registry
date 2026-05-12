import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";

import { getZanaYAMLHeader } from "./utils";

type RegistryEntry = {
  source?: {
    parser_url?: string;
    parser_location?: string;
    queries_url?: string;
    queries_semver?: boolean;
    type?: string;
  };
};

type ExternalQueries = { repo_url: string; semver?: boolean };

type BuildRow = {
  language: string;
  grammar_dir: string;
  external_queries?: ExternalQueries;
};

type RegistryJson = Record<string, RegistryEntry> & { $schema?: string };

type RepoKey = `${string}/${string}`;

const WORKSPACE_ROOT = path.join(__dirname, "..");
const REGISTRY_PATH = path.join(
  WORKSPACE_ROOT,
  ".tmp",
  "treesitter-registry.json",
);
const PACKAGES_DIR = path.join(WORKSPACE_ROOT, "packages", "github");

const parseGithubRepo = (url: string): RepoKey | null => {
  const m = url.match(
    /^https:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/,
  );
  if (!m) return null;
  return `${m[1]}/${m[2]}`;
};

const ensureDir = (dir: string) => fs.mkdirSync(dir, { recursive: true });

const main = () => {
  if (!fs.existsSync(REGISTRY_PATH)) {
    throw new Error(
      `Missing registry file at ${REGISTRY_PATH}. Download it first.`,
    );
  }

  const registry = JSON.parse(
    fs.readFileSync(REGISTRY_PATH, "utf8"),
  ) as RegistryJson;

  // Group registry entries by parser repo (GitHub only).
  const repoToBuilds = new Map<RepoKey, BuildRow[]>();

  for (const [languageKey, raw] of Object.entries(registry)) {
    if (languageKey === "$schema") continue;
    const entry = raw as RegistryEntry;
    const parserUrl = entry?.source?.parser_url;
    if (!parserUrl) continue;

    const repoKey = parseGithubRepo(parserUrl);
    if (!repoKey) continue;

    const grammar_dir = entry?.source?.parser_location ?? ".";
    const qUrl = entry?.source?.queries_url?.trim();
    let external_queries: ExternalQueries | undefined;
    if (qUrl) {
      external_queries = { repo_url: qUrl };
      if (entry?.source?.queries_semver) {
        external_queries.semver = true;
      }
    }
    const builds = repoToBuilds.get(repoKey) ?? [];
    const row: BuildRow = { language: languageKey, grammar_dir };
    if (external_queries) row.external_queries = external_queries;
    builds.push(row);
    repoToBuilds.set(repoKey, builds);
  }

  const generated: string[] = [];
  const skippedExisting: string[] = [];

  for (const [repoKey, builds] of [...repoToBuilds.entries()].sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    const [owner, repo] = repoKey.split("/");
    const packageDir = path.join(PACKAGES_DIR, owner, repo);
    const yamlPath = path.join(packageDir, "zana.yaml");

    if (fs.existsSync(yamlPath)) {
      skippedExisting.push(yamlPath);
      continue;
    }

    // Stable ordering for diffs.
    builds.sort((a, b) => a.language.localeCompare(b.language));

    const languagesList = builds.map((b) => b.language).join(", ");
    const doc = {
      name: repo,
      description: `Tree-sitter grammar${builds.length === 1 ? "" : "s"} for ${languagesList}.`,
      homepage: `https://github.com/${repoKey}`,
      licenses: ["MIT"],
      languages: [],
      categories: ["Tree-sitter-parser"],
      source: {
        id: `github:${repoKey}`,
      },
      treesitter: {
        build: builds,
      },
    };

    ensureDir(packageDir);
    const content = getZanaYAMLHeader() + "\n" +
      yaml.dump(doc, { lineWidth: -1, noRefs: true });
    fs.writeFileSync(yamlPath, content, "utf8");
    generated.push(yamlPath);
  }

  console.log(
    `Generated ${generated.length} package(s). Skipped ${skippedExisting.length} existing package(s).`,
  );
  if (generated.length > 0) console.log(generated.join("\n"));
};

main();

