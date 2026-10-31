/**
 * The learnings store: cross-session memory that garbage-collects itself.
 *
 * A file of notes that nobody prunes becomes a file of lies — and a lie the
 * agent reads at the top of every session is worse than no memory at all,
 * because it is stated with the same authority as the truth next to it. So the
 * store is not "a markdown file we promise to tidy". It is a record format with
 * two *mechanical* staleness checks that a script can run without judgement:
 *
 *   STALE    — the learning depends on a file that no longer exists. Whatever
 *              it taught, it taught about code that is gone.
 *   CONFLICT — a newer learning under the same key says something different.
 *              Both cannot be current; the newer one wins.
 *
 * Neither detector needs to understand English, and that is the point: anything
 * that needs a model to decide is a thing that will quietly never get done.
 *
 * This module is deliberately free of `node:fs`. Every entry point takes text
 * or takes an injected `fileExists`, so the tests exercise the real detectors
 * against in-memory records instead of a fixture tree on disk — a fixture tree
 * that would itself rot, which is the exact failure the module exists to fight.
 * The filesystem lives in scripts/learnings.ts, and only there.
 */

/** One line of docs/learnings.jsonl. */
export interface Learning {
  /**
   * A stable slug naming *the subject the insight is about*, not the insight.
   * It is the join key of the whole design: two records that claim different
   * things about the same subject are only detectable as a contradiction if
   * they agree on what the subject is called. `pglite-concurrency`, not
   * `pglite-is-single-threaded`.
   */
  key: string;
  /** The insight itself, in English, as a sentence a future session can act on. */
  insight: string;
  /**
   * Repo-relative paths the insight depends on. This is what makes STALE
   * mechanical — no refs, no expiry. A record with an empty `refs` is a
   * deliberate choice, not an omission: a user preference ("ship small PRs")
   * depends on no file and should never be auto-flagged.
   */
  refs: string[];
  /** ISO date, `YYYY-MM-DD` or a full timestamp. Orders the conflict resolution. */
  date: string;
  /** Which skill or session produced it, so a bad record's blast radius is traceable. */
  source: string;
}

/** A malformed line, kept rather than thrown, so one bad byte can't hide the rest. */
export interface ParseError {
  /** 1-based, so it matches what an editor shows. */
  line: number;
  raw: string;
  reason: string;
}

export interface ParseResult {
  records: Learning[];
  errors: ParseError[];
}

export type Reason = "STALE" | "CONFLICT";

export interface Finding {
  reason: Reason;
  /** Index into the `records` array that was scanned — `prune` removes by this. */
  index: number;
  record: Learning;
  /** Human-readable justification, quoted back to the user before anything is deleted. */
  detail: string;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}([T ].*)?$/;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

/**
 * Validates one parsed JSON value into a `Learning`, or explains why it isn't.
 *
 * Strict on the two fields the detectors depend on (`key`, `date`): a record
 * with a junk date sorts unpredictably against its siblings, and a record with
 * a junk key can never be matched against a contradiction. A store that
 * silently accepts those is a store whose GC quietly stops working.
 */
function toLearning(value: unknown): Learning | string {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return "not a JSON object";
  }
  const raw = value as Record<string, unknown>;

  if (typeof raw.key !== "string" || !SLUG.test(raw.key)) {
    return "'key' must be a kebab-case slug";
  }
  if (typeof raw.insight !== "string" || raw.insight.trim() === "") {
    return "'insight' must be a non-empty string";
  }
  if (!isStringArray(raw.refs)) {
    return "'refs' must be an array of repo-relative paths";
  }
  if (typeof raw.date !== "string" || !ISO_DATE.test(raw.date)) {
    return "'date' must be an ISO date (YYYY-MM-DD)";
  }
  if (typeof raw.source !== "string" || raw.source.trim() === "") {
    return "'source' must name the skill or session that recorded this";
  }

  return {
    key: raw.key,
    insight: raw.insight,
    refs: raw.refs,
    date: raw.date,
    source: raw.source,
  };
}

/** JSONL in, records + a list of the lines that weren't. Blank lines are not errors. */
export function parse(text: string): ParseResult {
  const records: Learning[] = [];
  const errors: ParseError[] = [];

  text.split(/\r?\n/).forEach((raw, index) => {
    const line = raw.trim();
    if (line === "") return;

    let value: unknown;
    try {
      value = JSON.parse(line);
    } catch {
      errors.push({ line: index + 1, raw, reason: "not valid JSON" });
      return;
    }

    const result = toLearning(value);
    if (typeof result === "string") {
      errors.push({ line: index + 1, raw, reason: result });
      return;
    }
    records.push(result);
  });

  return { records, errors };
}

/**
 * Records → file text. Keys are written in a fixed order so that re-serializing
 * an unchanged store produces a byte-identical file; otherwise every prune would
 * show up as a diff touching every line, and nobody would read those diffs.
 */
export function serialize(records: Learning[]): string {
  if (records.length === 0) return "";
  return (
    records
      .map((r) =>
        JSON.stringify({
          key: r.key,
          insight: r.insight,
          refs: r.refs,
          date: r.date,
          source: r.source,
        }),
      )
      .join("\n") + "\n"
  );
}

/**
 * Appends to the store *text*, not to a file — append-only is the invariant that
 * makes conflict detection possible at all. We never rewrite an older record in
 * place when a new one supersedes it; we write the new one and let `findConflicts`
 * surface the pair. History is what tells you the store changed its mind.
 */
export function append(text: string, record: Learning): string {
  const base = text.trim() === "" ? "" : text.replace(/\n*$/, "\n");
  return base + serialize([record]);
}

/**
 * A learning whose referenced file is gone.
 *
 * `fileExists` is injected rather than imported so this is a pure function of
 * its arguments — and so a caller can point it at a git tree, a worktree, or a
 * map in a test, none of which need to be the process's cwd.
 */
export function findStale(
  records: Learning[],
  fileExists: (path: string) => boolean,
): Finding[] {
  const findings: Finding[] = [];

  records.forEach((record, index) => {
    const missing = record.refs.filter((ref) => !fileExists(ref));
    if (missing.length === 0) return;
    findings.push({
      reason: "STALE",
      index,
      record,
      // Naming the paths matters: "stale" alone invites the reader to assume the
      // whole record is worthless, when often one ref moved and the insight holds.
      detail: `refs no longer exist: ${missing.join(", ")}`,
    });
  });

  return findings;
}

/** Newest first; ties broken by later position in the file, which is later in time. */
function newerFirst(
  a: { record: Learning; index: number },
  b: { record: Learning; index: number },
): number {
  if (a.record.date !== b.record.date) {
    return a.record.date < b.record.date ? 1 : -1;
  }
  return b.index - a.index;
}

/**
 * Two records under the same key that say different things. The newer one wins;
 * the older ones are the findings, because those are what a prune would delete.
 *
 * Identical insights under one key are NOT a conflict — that is a session
 * re-learning the same lesson, which is a signal the lesson is real, not a
 * contradiction. Only the text differing makes it a claim the store cannot hold
 * two of. This is a deliberately dumb comparison: asking a model "do these
 * contradict?" would make the GC depend on a judgement call, and a GC that needs
 * a judgement call is a GC that never runs.
 */
export function findConflicts(records: Learning[]): Finding[] {
  const byKey = new Map<string, { record: Learning; index: number }[]>();
  records.forEach((record, index) => {
    const bucket = byKey.get(record.key) ?? [];
    bucket.push({ record, index });
    byKey.set(record.key, bucket);
  });

  const findings: Finding[] = [];

  for (const bucket of byKey.values()) {
    if (bucket.length < 2) continue;

    const sorted = [...bucket].sort(newerFirst);
    const winner = sorted[0];
    if (!winner) continue;

    for (const loser of sorted.slice(1)) {
      if (loser.record.insight === winner.record.insight) continue;
      findings.push({
        reason: "CONFLICT",
        index: loser.index,
        record: loser.record,
        detail: `superseded by the ${winner.record.date} record under key '${winner.record.key}': "${winner.record.insight}"`,
      });
    }
  }

  // Findings come out in file order regardless of key iteration order, so the
  // report a human reads matches the file they would open.
  return findings.sort((a, b) => a.index - b.index);
}

/**
 * Drops exactly the records named by `findings`, keeping everything else in
 * order. It takes findings rather than a predicate so that what gets deleted is
 * always exactly what was shown to the user for approval — there is no second,
 * differently-computed pass that could quietly disagree with the report.
 */
export function prune(records: Learning[], findings: Finding[]): Learning[] {
  const doomed = new Set(findings.map((f) => f.index));
  return records.filter((_record, index) => !doomed.has(index));
}
