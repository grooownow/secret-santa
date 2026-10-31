/**
 * i18n:check — the red-or-green gate for landing content.
 *
 * Contract (marketing/strategy/2026-07-31-landing-i18n-brief.md, «Проверка —
 * скриптом»): identical key sets across locales, no empty strings, length
 * budgets respected, placeholders preserved, glossary terms untranslated,
 * stale translations (source string changed since the `from` hash was
 * recorded) listed. Any issue → exit 1 → the site does not build.
 */
import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";

export interface Leaf {
  text: string;
  from?: string;
  status?: string;
}

export interface LocaleSpec {
  source: string | null;
  role: "human" | "mt";
}

export interface Budget {
  min?: number;
  max?: number;
  perLocale?: Record<string, { min?: number; max?: number }>;
}

export interface Schema {
  locales: Record<string, LocaleSpec>;
  budgets: Record<string, Budget>;
  keys: string[];
}

export interface Issue {
  locale: string;
  key: string;
  kind:
    | "missing-key"
    | "extra-key"
    | "empty"
    | "over-budget"
    | "under-budget"
    | "missing-from"
    | "stale"
    | "bad-status"
    | "placeholder-mismatch"
    | "glossary"
    | "file";
  detail: string;
}

export type LocaleTree = Record<string, unknown>;

const VALID_STATUSES = new Set(["human", "mt", "mt-reviewed"]);

/** `[email]`-style slots that must survive translation verbatim. */
const PLACEHOLDER_RE = /\[(?:email|github)\]/g;

/** 12-hex prefix of sha256 — the `from` fingerprint of a source string. */
export function hashText(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex").slice(0, 12);
}

function isLeaf(value: unknown): value is Leaf {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Leaf).text === "string"
  );
}

/** Flatten a locale tree into dot-path → leaf, ignoring `_meta` and `$comment`. */
export function collectLeaves(
  node: LocaleTree,
  prefix = "",
  out: Map<string, Leaf> = new Map(),
): Map<string, Leaf> {
  for (const [key, value] of Object.entries(node)) {
    if (prefix === "" && (key === "_meta" || key === "$comment")) continue;
    const dotPath = prefix === "" ? key : `${prefix}.${key}`;
    if (isLeaf(value)) {
      out.set(dotPath, value);
    } else if (typeof value === "object" && value !== null) {
      collectLeaves(value as LocaleTree, dotPath, out);
    }
  }
  return out;
}

function placeholdersOf(text: string): string {
  return [...text.matchAll(PLACEHOLDER_RE)]
    .map((m) => m[0])
    .sort()
    .join(",");
}

function budgetFor(
  schema: Schema,
  key: string,
  locale: string,
): { min?: number; max?: number } | undefined {
  const budget = schema.budgets[key];
  if (!budget) return undefined;
  return { ...budget, ...budget.perLocale?.[locale] };
}

export function checkLocale(
  schema: Schema,
  glossaryTerms: string[],
  locale: string,
  tree: LocaleTree,
  sourceTree?: LocaleTree,
): Issue[] {
  const issues: Issue[] = [];
  const leaves = collectLeaves(tree);
  const sourceLeaves = sourceTree ? collectLeaves(sourceTree) : undefined;
  const wanted = new Set(schema.keys);

  for (const key of schema.keys) {
    if (!leaves.has(key)) {
      issues.push({ locale, key, kind: "missing-key", detail: "key absent" });
    }
  }
  for (const key of leaves.keys()) {
    if (!wanted.has(key)) {
      issues.push({
        locale,
        key,
        kind: "extra-key",
        detail: "key not in schema",
      });
    }
  }

  for (const [key, leaf] of leaves) {
    if (!wanted.has(key)) continue;

    if (leaf.text.trim() === "") {
      issues.push({ locale, key, kind: "empty", detail: "empty string" });
      continue;
    }

    const budget = budgetFor(schema, key, locale);
    if (budget) {
      const length = [...leaf.text].length;
      if (budget.max !== undefined && length > budget.max) {
        issues.push({
          locale,
          key,
          kind: "over-budget",
          detail: `${length} > max ${budget.max}`,
        });
      }
      if (budget.min !== undefined && length < budget.min) {
        issues.push({
          locale,
          key,
          kind: "under-budget",
          detail: `${length} < min ${budget.min}`,
        });
      }
    }

    // Translation-only checks: fingerprint, status, placeholders, glossary.
    const source = sourceLeaves?.get(key);
    if (!source) continue;

    if (leaf.from === undefined) {
      issues.push({
        locale,
        key,
        kind: "missing-from",
        detail: "translated leaf has no `from` hash",
      });
    } else if (leaf.from !== hashText(source.text)) {
      issues.push({
        locale,
        key,
        kind: "stale",
        detail: `source changed (expected from=${hashText(source.text)})`,
      });
    }

    if (leaf.status === undefined || !VALID_STATUSES.has(leaf.status)) {
      issues.push({
        locale,
        key,
        kind: "bad-status",
        detail: `status must be one of ${[...VALID_STATUSES].join(" | ")}`,
      });
    }

    if (placeholdersOf(leaf.text) !== placeholdersOf(source.text)) {
      issues.push({
        locale,
        key,
        kind: "placeholder-mismatch",
        detail: `source has [${placeholdersOf(source.text)}], translation has [${placeholdersOf(leaf.text)}]`,
      });
    }

    for (const term of glossaryTerms) {
      if (source.text.includes(term) && !leaf.text.includes(term)) {
        issues.push({
          locale,
          key,
          kind: "glossary",
          detail: `term "${term}" from the source is missing (glossary terms are never translated)`,
        });
      }
    }
  }

  return issues;
}

export function runChecks(
  schema: Schema,
  glossaryTerms: string[],
  files: Map<string, LocaleTree>,
): Issue[] {
  const issues: Issue[] = [];
  for (const [locale, tree] of files) {
    const spec = schema.locales[locale];
    if (!spec) {
      issues.push({
        locale,
        key: "_meta",
        kind: "file",
        detail: "locale not declared in schema.json",
      });
      continue;
    }
    let sourceTree: LocaleTree | undefined;
    if (spec.source !== null) {
      sourceTree = files.get(spec.source);
      if (!sourceTree) {
        issues.push({
          locale,
          key: "_meta",
          kind: "file",
          detail: `source locale "${spec.source}" file is missing`,
        });
        continue;
      }
    }
    issues.push(
      ...checkLocale(schema, glossaryTerms, locale, tree, sourceTree),
    );
  }
  return issues;
}

function readJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

export function main(contentDir: string): number {
  const schema = readJson<Schema>(path.join(contentDir, "schema.json"));
  const glossary = readJson<{ terms: string[] }>(
    path.join(contentDir, "glossary.json"),
  );

  const files = new Map<string, LocaleTree>();
  const pending: string[] = [];
  for (const [locale, spec] of Object.entries(schema.locales)) {
    const filePath = path.join(contentDir, `${locale}.json`);
    if (existsSync(filePath)) {
      files.set(locale, readJson<LocaleTree>(filePath));
    } else if (spec.role === "human") {
      console.error(`✗ ${locale}: human-source locale file is missing`);
      return 1;
    } else {
      pending.push(locale); // MT locale not produced yet — noted, not red.
    }
  }

  const issues = runChecks(schema, glossary.terms, files);

  if (pending.length > 0) {
    console.log(`… pending MT locales (no file yet): ${pending.join(", ")}`);
  }
  if (issues.length === 0) {
    console.log(
      `✓ i18n:check — ${files.size} locale(s), ${schema.keys.length} keys, 0 issues`,
    );
    return 0;
  }
  for (const issue of issues) {
    console.error(
      `✗ [${issue.locale}] ${issue.key} — ${issue.kind}: ${issue.detail}`,
    );
  }
  console.error(`✗ i18n:check — ${issues.length} issue(s). Not building.`);
  return 1;
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  const contentDir = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    "content",
  );
  process.exitCode = main(contentDir);
}
