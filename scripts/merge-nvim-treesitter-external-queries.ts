/**
 * Merges Neovim tree-sitter parser registry query metadata into Zana package YAMLs.
 *
 * For each treesitter.build[] row, looks up the language key in the nvim registry
 * and merges query repo metadata into external_queries (single object or array).
 * Supports `source.queries_url` / `queries_semver` (type external_queries) and
 * `source.url` / `semver` (type queries_only, e.g. html_tags).
 * If the nvim entry lists `requires`, each required language's query repo is merged too
 * (e.g. html → html_tags; angular → html + html_tags).
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
  /** external_queries | queries_only | ... */
  type?: string;
  /** queries_only query-only git repo */
  url?: string;
  /** queries_only semver tag selection */
  semver?: boolean;
};

type NvimRegistryEntry = {
  filetypes?: string[];
  requires?: string[];
  source?: NvimSource;
};

type NvimRegistry = Record<string, NvimRegistryEntry> & { $schema?: string };

type ExternalQueriesEntry = { repo_url: string; semver?: boolean; ref?: string };
/** One object (legacy / compact) or a list when multiple query repos apply. */
type ExternalQueriesSpec = ExternalQueriesEntry | ExternalQueriesEntry[];

type BuildRow = {
  language: string;
  grammar_dir: string;
  integrations?: string[];
  inherits?: string[];
  external_queries?: ExternalQueriesSpec;
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

const asEntryArray = (spec?: ExternalQueriesSpec): ExternalQueriesEntry[] => {
  if (spec == null) return [];
  if (Array.isArray(spec)) return spec.map((e) => ({ ...e }));
  return [{ ...spec }];
};

const entriesEqual = (a: ExternalQueriesEntry, b: ExternalQueriesEntry): boolean =>
  a.repo_url === b.repo_url &&
  Boolean(a.semver) === Boolean(b.semver) &&
  (a.ref ?? "") === (b.ref ?? "");

const sortedEntries = (e: ExternalQueriesEntry[]): ExternalQueriesEntry[] =>
  [...e].sort((x, y) => x.repo_url.localeCompare(y.repo_url));

const entryArraysEqual = (a: ExternalQueriesEntry[], b: ExternalQueriesEntry[]): boolean => {
  if (a.length !== b.length) return false;
  const na = sortedEntries(a);
  const nb = sortedEntries(b);
  return na.every((e, i) => entriesEqual(e, nb[i]!));
};

/** Neovim registry: external_queries uses queries_url; queries_only uses url + semver. */
const queryRepoFromNvimSource = (source?: NvimSource): ExternalQueriesEntry | null => {
  if (!source) return null;
  if ((source.type ?? "").trim() === "queries_only") {
    const u = source.url?.trim();
    if (!u) return null;
    return { repo_url: u, semver: Boolean(source.semver) };
  }
  const u = source.queries_url?.trim();
  if (!u) return null;
  return { repo_url: u, semver: Boolean(source.queries_semver) };
};

/** Single object when only one repo (stable YAML); otherwise an array. */
const canonicalExternalQueriesSpec = (entries: ExternalQueriesEntry[]): ExternalQueriesSpec => {
  if (entries.length === 1) return { ...entries[0]! };
  return entries;
};

const mergeNvExternalInto = (
  existing: ExternalQueriesSpec | undefined,
  want: ExternalQueriesEntry,
): ExternalQueriesSpec => {
  const cur = asEntryArray(existing);
  const idx = cur.findIndex((e) => e.repo_url === want.repo_url);
  if (idx >= 0) {
    const next = [...cur];
    next[idx] = { ...want };
    return canonicalExternalQueriesSpec(next);
  }
  return canonicalExternalQueriesSpec([...cur, { ...want }]);
};

const mergeNvListInto = (
  existing: ExternalQueriesSpec | undefined,
  wants: ExternalQueriesEntry[],
): ExternalQueriesSpec => {
  let cur: ExternalQueriesSpec | undefined = existing;
  for (const w of wants) {
    cur = mergeNvExternalInto(cur, w);
  }
  return cur ?? canonicalExternalQueriesSpec([]);
};

const externalListWouldChange = (
  existing: ExternalQueriesSpec | undefined,
  wants: ExternalQueriesEntry[],
): boolean => {
  if (wants.length === 0) return false;
  const merged = mergeNvListInto(existing, wants);
  return !entryArraysEqual(asEntryArray(existing), asEntryArray(merged));
};

/** Primary language query repo plus each `requires` language (deduped by repo). */
const desiredNvimExternalQueries = (
  registry: NvimRegistry,
  langToQueries: Map<string, ExternalQueriesEntry>,
  lang: string,
): ExternalQueriesEntry[] => {
  lang = lang.trim();
  if (lang === "" || lang === "$schema") return [];
  const entry = registry[lang];
  const primary = queryRepoFromNvimSource(entry?.source);
  if (!primary) return [];

  const out: ExternalQueriesEntry[] = [];
  const seen = new Set<string>();

  const push = (e: ExternalQueriesEntry) => {
    const u = e.repo_url.trim();
    if (!u || seen.has(u)) return;
    seen.add(u);
    const row: ExternalQueriesEntry = { repo_url: u, semver: Boolean(e.semver) };
    if (e.ref !== undefined && e.ref !== "") row.ref = e.ref;
    out.push(row);
  };

  push(primary);

  for (const req of entry?.requires ?? []) {
    const dep = langToQueries.get(req.trim());
    if (dep) push({ ...dep });
  }

  return out;
};

const loadRegistry = async (p: string): Promise<NvimRegistry> => {
  if (fs.existsSync(p)) {
    const rawText = fs.readFileSync(p, "utf8");
    // Tolerate saved web pages or editor wrappers before the first `{`.
    const start = rawText.indexOf("{");
    if (start < 0) {
      throw new Error(`no JSON object found in registry file: ${p}`);
    }
    return JSON.parse(rawText.slice(start)) as NvimRegistry;
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

  /** language -> Neovim query-only repo (queries_url or queries_only url) */
  const langToQueries = new Map<string, ExternalQueriesEntry>();
  for (const [lang, raw] of Object.entries(registry)) {
    if (lang === "$schema") continue;
    const entry = raw as NvimRegistryEntry;
    const q = queryRepoFromNvimSource(entry?.source);
    if (q) langToQueries.set(lang, q);
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
      let integrations = row.integrations ?? [];
      if (integrations.length === 0) {
        integrations = ["neovim"];
        changed = true;
      }
      const withIntegrations: BuildRow = { ...row, integrations };
      const desired = desiredNvimExternalQueries(registry, langToQueries, row.language.trim());
      if (desired.length === 0) return withIntegrations;
      if (!externalListWouldChange(withIntegrations.external_queries, desired)) return withIntegrations;
      changed = true;
      return {
        ...withIntegrations,
        external_queries: mergeNvListInto(withIntegrations.external_queries, desired),
      };
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
