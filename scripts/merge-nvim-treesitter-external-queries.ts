/**
 * Merges Neovim tree-sitter parser registry query metadata into Zana package YAMLs.
 *
 * For each treesitter.build[] row, looks up the language key in the nvim registry
 * and, when queries_url is present, sets external_queries { repo_url, semver }.
 *
 * Usage:
 *   bun scripts/merge-nvim-treesitter-external-queries.ts [--dry-run] [path-to-registry.json]
 *
 * Default registry path: .tmp/treesitter-registry.json
 * If the file is missing, downloads from the official nvim-treesitter registry URL.
 */
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import * as yaml from "js-yaml";

import { getZanaYAMLHeader } from "./utils";

const WORKSPACE_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const DEFAULT_REGISTRY_URL =
  "https://raw.githubusercontent.com/neovim-treesitter/treesitter-parser-registry/refs/heads/main/registry.json";

type NvimSource = {
  queries_url?: string;
  queries_semver?: boolean;
  type?: string;
};

type NvimRegistry = Record<string, { source?: NvimSource }> & { $schema?: string };

type ExternalQueries = { repo_url: string; semver?: boolean; ref?: string };

type BuildRow = {
  language: string;
  grammar_dir: string;
  inherits?: string[];
  external_queries?: ExternalQueries;
};

type ZanaDoc = {
  name?: string;
  treesitter?: { build?: BuildRow[] };
  [key: string]: unknown;
};

const findPackageFiles = (dir: string): string[] => {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...findPackageFiles(full));
    else if (entry.isFile() && entry.name === "zana.yaml") out.push(full);
  }
  return out;
};

const sameExternal = (a?: ExternalQueries, b?: ExternalQueries): boolean => {
  if (!a || !b) return false;
  return (
    a.repo_url === b.repo_url &&
    Boolean(a.semver) === Boolean(b.semver) &&
    (a.ref ?? "") === (b.ref ?? "")
  );
};

const loadRegistry = async (p: string): Promise<NvimRegistry> => {
  if (fs.existsSync(p)) {
    return JSON.parse(fs.readFileSync(p, "utf8")) as NvimRegistry;
  }
  console.log(`Fetching registry from ${DEFAULT_REGISTRY_URL}`);
  const res = await fetch(DEFAULT_REGISTRY_URL);
  if (!res.ok) throw new Error(`fetch registry: ${res.status} ${res.statusText}`);
  return (await res.json()) as NvimRegistry;
};

const main = async () => {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const posArgs = args.filter((a) => a !== "--dry-run");
  const registryPath = path.resolve(
    WORKSPACE_ROOT,
    posArgs[0] ?? ".tmp/treesitter-registry.json",
  );

  const registry = await loadRegistry(registryPath);

  /** language -> external_queries from nvim (only when queries_url set) */
  const langToQueries = new Map<string, ExternalQueries>();
  for (const [lang, raw] of Object.entries(registry)) {
    if (lang === "$schema") continue;
    const entry = raw as { source?: NvimSource };
    const url = entry?.source?.queries_url?.trim();
    if (!url) continue;
    langToQueries.set(lang, {
      repo_url: url,
      semver: Boolean(entry?.source?.queries_semver),
    });
  }

  const packagesDir = path.join(WORKSPACE_ROOT, "packages");
  const files = findPackageFiles(packagesDir);

  let updated = 0;
  let scanned = 0;

  for (const yamlPath of files) {
    const raw = fs.readFileSync(yamlPath, "utf8");
    const docs = yaml.loadAll(raw) as ZanaDoc[];
    const doc = docs[0];
    if (!doc?.treesitter?.build?.length) continue;
    scanned++;

    let changed = false;
    const nextBuild = doc.treesitter!.build!.map((row) => {
      const want = langToQueries.get(row.language);
      if (!want) return row;
      if (sameExternal(row.external_queries, want)) return row;
      changed = true;
      return { ...row, external_queries: { ...want } };
    });

    if (!changed) continue;

    doc.treesitter = { ...doc.treesitter, build: nextBuild };
    updated++;
    if (dryRun) {
      console.log(`[dry-run] would update ${yamlPath}`);
      continue;
    }

    const body = yaml.dump(doc, { lineWidth: -1, noRefs: true });
    fs.writeFileSync(yamlPath, getZanaYAMLHeader() + "\n" + body, "utf8");
    console.log(`updated ${yamlPath}`);
  }

  console.log(
    `Done. Packages with treesitter: ${scanned}. ${dryRun ? "Would update" : "Updated"}: ${updated}.`,
  );
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
