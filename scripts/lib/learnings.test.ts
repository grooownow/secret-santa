import { describe, expect, it } from "vitest";

import {
  append,
  findConflicts,
  findStale,
  parse,
  prune,
  serialize,
  type Learning,
} from "./learnings";

/**
 * The detectors are the only reason this store is trustworthy, so the tests that
 * matter here are the ones that prove each detector BOTH fires and stays quiet.
 * A detector that only ever fires is a detector everybody learns to ignore; one
 * that never fires is decoration. Every case below flips exactly one variable
 * away from a passing baseline, so a regression can only be explained by the
 * thing the test names.
 */

function learning(over: Partial<Learning> = {}): Learning {
  return {
    key: "pglite-concurrency",
    insight: "PGlite instances do not tolerate concurrent test files.",
    refs: ["vitest.config.ts"],
    date: "2026-07-01",
    source: "feature",
    ...over,
  };
}

/** The injected filesystem: a set, so no test needs a fixture tree on disk. */
function existsIn(paths: string[]): (path: string) => boolean {
  const set = new Set(paths);
  return (path) => set.has(path);
}

describe("parse", () => {
  it("reads one record per line and ignores blank lines", () => {
    const text = `${JSON.stringify(learning())}\n\n${JSON.stringify(
      learning({ key: "small-prs", refs: [] }),
    )}\n`;

    const { records, errors } = parse(text);

    expect(errors).toEqual([]);
    expect(records.map((r) => r.key)).toEqual([
      "pglite-concurrency",
      "small-prs",
    ]);
    expect(records[0]?.refs).toEqual(["vitest.config.ts"]);
  });

  it("reports a malformed line instead of throwing, and keeps the good ones", () => {
    const text = `${JSON.stringify(learning())}\nnot json at all\n`;

    const { records, errors } = parse(text);

    expect(records).toHaveLength(1);
    expect(errors).toEqual([
      { line: 2, raw: "not json at all", reason: "not valid JSON" },
    ]);
  });

  it.each([
    ["key", { key: "Not A Slug" }, /key/],
    ["insight", { insight: "" }, /insight/],
    ["refs", { refs: "vitest.config.ts" }, /refs/],
    ["date", { date: "last tuesday" }, /date/],
    ["source", { source: "" }, /source/],
  ])("rejects a record whose '%s' is unusable", (_field, over, reason) => {
    // A junk date sorts unpredictably and a junk key can never be matched
    // against its contradiction — both silently disable the GC, so both are
    // parse errors rather than warnings.
    const { records, errors } = parse(
      JSON.stringify({ ...learning(), ...over }),
    );

    expect(records).toEqual([]);
    expect(errors[0]?.reason).toMatch(reason);
  });

  it("accepts the well-formed baseline (proving the rejections above are about the field, not the shape)", () => {
    const { records, errors } = parse(JSON.stringify(learning()));
    expect(errors).toEqual([]);
    expect(records).toHaveLength(1);
  });
});

describe("serialize / append", () => {
  it("round-trips records unchanged", () => {
    const records = [learning(), learning({ key: "small-prs", refs: [] })];
    expect(parse(serialize(records)).records).toEqual(records);
  });

  it("is byte-stable: re-serializing an unchanged store produces the same text", () => {
    const once = serialize(parse(serialize([learning()])).records);
    const twice = serialize(parse(once).records);
    expect(twice).toBe(once);
  });

  it("appends without rewriting what is already there", () => {
    const before = serialize([learning()]);
    const after = append(before, learning({ key: "small-prs", refs: [] }));

    expect(after.startsWith(before)).toBe(true);
    expect(parse(after).records).toHaveLength(2);
  });

  it("appends to an empty store without leaving a leading blank line", () => {
    const text = append("", learning());
    expect(text).toBe(serialize([learning()]));
  });

  it("does not double a trailing newline when the store already ends with one", () => {
    const text = append(
      `${serialize([learning()])}\n\n`,
      learning({ key: "x" }),
    );
    expect(text).not.toMatch(/\n\n/);
    expect(parse(text).records).toHaveLength(2);
  });
});

describe("findStale", () => {
  it("flags a learning whose referenced file has been deleted", () => {
    const records = [learning({ refs: ["src/lib/gone.ts"] })];

    const findings = findStale(records, existsIn(["vitest.config.ts"]));

    expect(findings).toHaveLength(1);
    expect(findings[0]?.reason).toBe("STALE");
    expect(findings[0]?.index).toBe(0);
    // The report names the path, because usually one ref moved and the insight
    // survives — the user needs enough to make that call.
    expect(findings[0]?.detail).toContain("src/lib/gone.ts");
  });

  it("stays quiet when every referenced file still exists", () => {
    const records = [learning({ refs: ["vitest.config.ts", "package.json"] })];

    expect(
      findStale(records, existsIn(["vitest.config.ts", "package.json"])),
    ).toEqual([]);
  });

  it("flags a record when only one of several refs is gone", () => {
    const records = [learning({ refs: ["package.json", "src/lib/gone.ts"] })];

    const findings = findStale(records, existsIn(["package.json"]));

    expect(findings).toHaveLength(1);
    expect(findings[0]?.detail).toContain("src/lib/gone.ts");
    expect(findings[0]?.detail).not.toContain("package.json");
  });

  it("never flags a learning that depends on no file at all", () => {
    // A stated preference ("ship small PRs") has no refs and therefore no
    // mechanical expiry. Auto-flagging it would make the report noise.
    const records = [learning({ key: "small-prs", refs: [] })];

    expect(findStale(records, existsIn([]))).toEqual([]);
  });
});

describe("findConflicts", () => {
  it("flags the older record when a newer one contradicts it under the same key", () => {
    const older = learning({
      date: "2026-01-10",
      insight: "Integration tests may run in parallel.",
    });
    const newer = learning({
      date: "2026-06-02",
      insight: "Integration tests must run single-threaded.",
    });

    const findings = findConflicts([older, newer]);

    expect(findings).toHaveLength(1);
    expect(findings[0]?.reason).toBe("CONFLICT");
    expect(findings[0]?.record).toBe(older);
    expect(findings[0]?.detail).toContain("single-threaded");
  });

  it("lets the newer record win regardless of its position in the file", () => {
    // Append order usually equals chronological order — but a rebase, a merge,
    // or a hand-edit can break that. The date decides, not the line number.
    const newer = learning({ date: "2026-06-02", insight: "Newer claim." });
    const older = learning({ date: "2026-01-10", insight: "Older claim." });

    const findings = findConflicts([newer, older]);

    expect(findings).toHaveLength(1);
    expect(findings[0]?.record).toBe(older);
    expect(findings[0]?.index).toBe(1);
  });

  it("breaks a same-day tie by file order, so the later line wins", () => {
    const first = learning({ date: "2026-07-12", insight: "First claim." });
    const second = learning({ date: "2026-07-12", insight: "Second claim." });

    const findings = findConflicts([first, second]);

    expect(findings).toHaveLength(1);
    expect(findings[0]?.record).toBe(first);
  });

  it("flags every superseded record, not just the most recent loser", () => {
    const records = [
      learning({ date: "2026-01-10", insight: "Claim A." }),
      learning({ date: "2026-03-10", insight: "Claim B." }),
      learning({ date: "2026-06-10", insight: "Claim C." }),
    ];

    const findings = findConflicts(records);

    expect(findings.map((f) => f.index)).toEqual([0, 1]);
  });

  it("stays quiet when records under one key repeat the same insight", () => {
    // Two sessions independently learning the same lesson is evidence the lesson
    // is real, not a contradiction. Flagging it would train the user to say "yes,
    // delete" without reading — which is how a real learning gets deleted.
    const records = [
      learning({ date: "2026-01-10" }),
      learning({ date: "2026-06-10" }),
    ];

    expect(findConflicts(records)).toEqual([]);
  });

  it("stays quiet when contradictory-looking insights sit under different keys", () => {
    const records = [
      learning({ key: "pglite-concurrency", insight: "Run single-threaded." }),
      learning({ key: "e2e-concurrency", insight: "Run in parallel." }),
    ];

    expect(findConflicts(records)).toEqual([]);
  });

  it("stays quiet on a store where every key appears once", () => {
    const records = [
      learning({ key: "pglite-concurrency" }),
      learning({ key: "small-prs", refs: [] }),
    ];

    expect(findConflicts(records)).toEqual([]);
  });
});

describe("prune", () => {
  it("removes exactly the flagged records and preserves the order of the rest", () => {
    const records = [
      learning({ key: "a", refs: ["src/gone.ts"] }),
      learning({ key: "b", refs: [] }),
      learning({ key: "c", refs: ["src/gone.ts"] }),
    ];

    const kept = prune(records, findStale(records, existsIn([])));

    expect(kept.map((r) => r.key)).toEqual(["b"]);
  });

  it("removes the union of both detectors in one pass", () => {
    const records = [
      learning({ key: "a", date: "2026-01-01", insight: "Old claim." }),
      learning({ key: "a", date: "2026-06-01", insight: "New claim." }),
      learning({ key: "b", refs: ["src/gone.ts"] }),
      learning({ key: "c", refs: [] }),
    ];

    const findings = [
      ...findStale(records, existsIn(["vitest.config.ts"])),
      ...findConflicts(records),
    ];
    const kept = prune(records, findings);

    expect(kept.map((r) => r.insight)).toEqual([
      "New claim.",
      learning({ key: "c" }).insight,
    ]);
  });

  it("is a no-op when nothing was flagged", () => {
    const records = [learning(), learning({ key: "small-prs", refs: [] })];
    expect(prune(records, [])).toEqual(records);
  });
});
