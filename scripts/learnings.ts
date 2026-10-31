#!/usr/bin/env tsx
/**
 * The CLI over the learnings store (scripts/lib/learnings.ts).
 *
 * All filesystem contact for the store lives here, and nowhere else — the
 * library stays pure so its detectors can be tested without a fixture tree that
 * would itself rot.
 *
 * Two commands matter:
 *
 *   check          — run both detectors, print candidates, change nothing.
 *   prune --apply  — delete exactly the candidates `check` just printed.
 *
 * They are separate on purpose. A garbage collector that deletes the user's
 * memory without showing them what it is deleting is not a feature; it is a
 * bug you find out about three weeks later. `check` is the report; `prune
 * --apply` is what the human authorizes after reading it.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  append,
  findConflicts,
  findStale,
  parse,
  prune,
  serialize,
  type Finding,
  type Learning,
} from "./lib/learnings";

const ROOT = process.cwd();
export const STORE = path.join("docs", "learnings.jsonl");

function storePath(): string {
  return path.join(ROOT, STORE);
}

/** A missing store is an empty store, not an error: the first `add` creates it. */
function readStore(): string {
  const file = storePath();
  return existsSync(file) ? readFileSync(file, "utf8") : "";
}

/** `refs` are repo-relative by contract, so existence is resolved against the repo root. */
function refExists(ref: string): boolean {
  return existsSync(path.join(ROOT, ref));
}

function loadRecords(): Learning[] {
  const { records, errors } = parse(readStore());
  // A malformed line is not skipped quietly: it is a record whose insight is now
  // invisible to every future session, which is exactly the silent rot this
  // store exists to prevent.
  for (const error of errors) {
    console.error(`✗ ${STORE}:${error.line}: ${error.reason} — ${error.raw}`);
  }
  if (errors.length > 0) process.exit(1);
  return records;
}

function scan(records: Learning[]): Finding[] {
  return [...findStale(records, refExists), ...findConflicts(records)].sort(
    (a, b) => a.index - b.index,
  );
}

function report(findings: Finding[]): void {
  for (const finding of findings) {
    console.log(
      `${finding.reason}  ${STORE}:${finding.index + 1}  [${finding.record.key}] ${finding.record.insight}`,
    );
    console.log(`        ${finding.detail}\n`);
  }
}

function commandList(): void {
  const records = loadRecords();
  if (records.length === 0) {
    console.log(`${STORE} is empty — nothing has been learned yet.`);
    return;
  }
  for (const record of records) {
    console.log(
      `[${record.key}] (${record.date}, ${record.source}) ${record.insight}`,
    );
    if (record.refs.length > 0)
      console.log(`        refs: ${record.refs.join(", ")}`);
  }
}

/**
 * `add --key … --insight … [--refs a,b] [--source …]`.
 *
 * The date is `new Date()`, never an argument: a record dated by its author is a
 * record whose date can be wrong, and every conflict resolution in the store
 * hangs off that date.
 */
function commandAdd(argv: string[]): void {
  const flag = (name: string): string | undefined => {
    const index = argv.indexOf(`--${name}`);
    return index === -1 ? undefined : argv[index + 1];
  };

  const key = flag("key");
  const insight = flag("insight");
  if (!key || !insight) {
    console.error(
      "usage: learnings.ts add --key <slug> --insight <text> [--refs a.ts,b.ts] [--source <skill>]",
    );
    process.exit(1);
  }

  const record: Learning = {
    key,
    insight,
    refs: (flag("refs") ?? "")
      .split(",")
      .map((ref) => ref.trim())
      .filter((ref) => ref !== ""),
    date: new Date().toISOString().slice(0, 10),
    source: flag("source") ?? "unknown",
  };

  const next = append(readStore(), record);
  // Round-trip through the parser before writing: a record the store cannot read
  // back is worse than a record that was never added, because it also breaks the
  // `check` that would have told you.
  const { errors } = parse(next);
  if (errors.length > 0) {
    console.error(`✗ refusing to write: ${errors[0]?.reason}`);
    process.exit(1);
  }

  writeFileSync(storePath(), next, "utf8");
  console.log(`✓ recorded [${record.key}] in ${STORE}`);
}

function commandCheck(): void {
  const findings = scan(loadRecords());
  if (findings.length === 0) {
    console.log("✓ no stale or conflicting learnings");
    return;
  }
  report(findings);
  console.log(
    `${findings.length} candidate(s) for pruning. Review them with the user, then run:\n` +
      `  pnpm exec tsx scripts/learnings.ts prune --apply`,
  );
  // Non-zero so a hook or a CI job can treat an unpruned store as a failing
  // state. `check` still never edits anything.
  process.exit(1);
}

function commandPrune(apply: boolean): void {
  const records = loadRecords();
  const findings = scan(records);

  if (findings.length === 0) {
    console.log("✓ nothing to prune");
    return;
  }

  report(findings);

  if (!apply) {
    console.log(
      `dry run — ${findings.length} record(s) would be deleted. Re-run with --apply to write.`,
    );
    return;
  }

  writeFileSync(storePath(), serialize(prune(records, findings)), "utf8");
  console.log(`✓ pruned ${findings.length} record(s) from ${STORE}`);
}

function main(): void {
  const [command, ...rest] = process.argv.slice(2);

  switch (command) {
    case "list":
      return commandList();
    case "add":
      return commandAdd(rest);
    case "check":
      return commandCheck();
    case "prune":
      return commandPrune(rest.includes("--apply"));
    default:
      console.error("usage: learnings.ts <list|add|check|prune> [options]");
      process.exit(1);
  }
}

if (process.argv[1]?.endsWith("learnings.ts")) main();
