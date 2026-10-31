/**
 * The gate sequence, as data and pure decisions.
 *
 * `verify` used to be a prose instruction: run four commands in order, decide
 * yourself which ones do not apply, then assemble a table of what happened. The
 * commands were always mechanical; only the *reporting* was left to a model
 * that also had a reason to want the table green. This module moves the
 * mechanical half where it belongs — which gates apply, in what order, what
 * their result was, what the evidence line is — so the table is produced by
 * code and cannot be paraphrased into an optimistic summary.
 *
 * Everything here is pure: no spawning, no filesystem, no clock. The CLI
 * (scripts/gates.ts) supplies the environment and the executor. That is what
 * lets the interesting cases — a gate that does not apply, a gate the user
 * waived, a failure that must stop the sequence — be tested without a five
 * minute build in the middle of `pnpm test`.
 */

/**
 * - `pass` / `fail` — the command ran and exited 0 / non-zero.
 * - `n/a` — the gate cannot apply to this project (no such script) or has
 *   nothing to check (the diff does not touch what it gates).
 * - `waived` — the user asked for it to be skipped, and said why. Distinct
 *   from `n/a` on purpose: `n/a` is a fact about the repo, `waived` is a
 *   decision by a person, and a reader of the ledger must be able to tell them
 *   apart a week later.
 * - `skipped` — an earlier gate failed, so this one never ran.
 */
export type GateStatus = "pass" | "fail" | "n/a" | "waived" | "skipped";

export interface GateSpec {
  /** Stable id used by `--only` and `--waive`. */
  name: string;
  /** Column text in the report. */
  label: string;
  command: string;
}

export interface PlannedGate extends GateSpec {
  /** Set before the run for gates that will not execute; undefined = will run. */
  status?: GateStatus;
  /** Why it is `n/a` or `waived`. Shown in the report's evidence column. */
  reason?: string;
}

export interface GateResult extends GateSpec {
  status: GateStatus;
  reason?: string;
  exitCode?: number;
  durationMs?: number;
  /** One quoted line from the command's own output. Never a paraphrase. */
  evidence?: string;
}

/**
 * The sequence, in the order `docs/rules/definition-of-done.md` expects it:
 * cheapest signal first, so a formatting error does not cost a five minute
 * Playwright run before anyone hears about it.
 */
export const GATES: readonly GateSpec[] = [
  { name: "lint", label: "Lint", command: "pnpm lint" },
  { name: "secrets", label: "Secrets", command: "pnpm secrets:scan" },
  { name: "test", label: "Unit/int tests", command: "pnpm test" },
  { name: "db-reset", label: "DB reset", command: "pnpm db:reset" },
  { name: "e2e", label: "E2E", command: "pnpm test:e2e" },
  { name: "build", label: "Build", command: "pnpm build" },
  {
    name: "perf",
    label: "Perf (Lighthouse)",
    command: "pnpm exec lhci autorun",
  },
  {
    name: "skills",
    label: "Skill harness",
    command: "pnpm skills:check && pnpm skills:validate && pnpm skills:evals",
  },
] as const;

/** Paths whose change makes the skill harness gate meaningful. */
const SKILL_HARNESS_PATHS = [
  ".claude/skills/",
  ".claude/skill-steps/",
  "docs/rules/",
  "CLAUDE.md",
  "AGENTS.md",
];

export interface PlanInput {
  /** Script names from package.json — `db:reset` only exists with persistence. */
  scripts: ReadonlySet<string>;
  /** Repo-relative paths in the diff under review. */
  changedPaths: readonly string[];
  /** gate name → reason the user gave for skipping it. */
  waivers?: Readonly<Record<string, string>>;
  /** When set, every gate not named here is left out of the run entirely. */
  only?: readonly string[];
  /** `pnpm gates --full` — opts in to the slow gates (Lighthouse). */
  full?: boolean;
}

/**
 * Decide, before running anything, what this run consists of.
 *
 * The two conditional gates are the ones a human gets wrong most often, in
 * opposite directions: `db:reset` gets run on a Landing project where the
 * script does not exist (and the failure reads like a broken database), and the
 * skill harness gets skipped on a diff that edited a skill (and nothing else in
 * the sequence reads those files, so the break ships).
 */
export function planGates(input: PlanInput): PlannedGate[] {
  const waivers = input.waivers ?? {};
  const only = input.only?.length ? new Set(input.only) : null;

  return GATES.filter((gate) => !only || only.has(gate.name)).map((gate) => {
    const waived = waivers[gate.name];
    if (waived !== undefined) {
      return { ...gate, status: "waived" as const, reason: waived };
    }

    if (gate.name === "db-reset" && !input.scripts.has("db:reset")) {
      return {
        ...gate,
        status: "n/a" as const,
        reason: "no db:reset script — Landing has no database",
      };
    }

    if (gate.name === "skills" && !touchesSkillHarness(input.changedPaths)) {
      return {
        ...gate,
        status: "n/a" as const,
        reason: "diff touches no skill, rule or entry map",
      };
    }

    // Lighthouse needs a prod build and minutes of wall clock, so it is
    // opt-in locally; CI runs it unconditionally (`lighthouse` job).
    if (gate.name === "perf" && !input.full) {
      return {
        ...gate,
        status: "n/a" as const,
        reason: "opt-in: `pnpm gates --full` runs the Lighthouse budget",
      };
    }

    return { ...gate };
  });
}

export function touchesSkillHarness(paths: readonly string[]): boolean {
  return paths.some((file) =>
    SKILL_HARNESS_PATHS.some((prefix) => file.startsWith(prefix)),
  );
}

/** Longer than this and it stops being a quotable line and starts being a dump. */
const EVIDENCE_MAX = 240;

/**
 * Vitest and Playwright print a bare `FAIL <file>`; matching the *first* line
 * that looks like a complaint gets the tool's own message.
 */
const FAILURE_LINE = /(^|\s)(error|fail(ed|ing|s)?)\b|✗|✖|×|Error:/i;

/**
 * The package runner's epilogue, which every failing gate ends with and which
 * names nothing: "[ELIFECYCLE] Command failed with exit code 1." Dropping it
 * before choosing is what makes the difference between quoting
 * "Code style issues found in 3 files" and quoting the shrug that followed it —
 * a distinction found by running this on its own first red gate.
 */
const RUNNER_EPILOGUE = /^\[?ELIFECYCLE\]?|^Command failed with exit code/i;

/**
 * What a passing tool says when it means it. The plain last line is usually
 * trailing decoration — vitest ends on `Duration 1.29s`, `next build` on a
 * legend row explaining what ƒ means — so a report built from last lines is
 * technically verbatim and practically useless. The last line that states a
 * *result* is the one a person would quote.
 */
const PASS_SIGNAL =
  /\b\d+\s+(passed|tests?)\b|compiled successfully|all matched files|no issues/i;

/**
 * One line out of the command's own output, chosen so the reader can see what
 * the tool said rather than what we concluded from it.
 *
 * On failure the last line is usually a runner's summary ("ELIFECYCLE Command
 * failed with exit code 1") which names nothing; the first line that looks like
 * the actual complaint is what a person would quote.
 */
export function evidenceFrom(output: string, status: GateStatus): string {
  const all = output
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim() !== "");
  const lines = all.filter((line) => !RUNNER_EPILOGUE.test(line.trim()));
  if (lines.length === 0) return all.length === 0 ? "(no output)" : all[0]!;

  const pick =
    status === "fail"
      ? (lines.find((line) => FAILURE_LINE.test(line)) ??
        lines[lines.length - 1]!)
      : (lines.findLast((line) => PASS_SIGNAL.test(line)) ??
        lines[lines.length - 1]!);

  const clean = pick.trim();
  return clean.length > EVIDENCE_MAX
    ? `${clean.slice(0, EVIDENCE_MAX - 1)}…`
    : clean;
}

export interface RunRecord {
  id: string;
  startedAt: string;
  finishedAt: string;
  branch: string;
  head: string;
  scope: string;
  gates: GateResult[];
  /** Judgment steps recorded by `pnpm gates:note` — see scripts/gates.ts. */
  notes: RunNote[];
  result: "pass" | "fail";
}

export interface RunNote {
  at: string;
  step: string;
  status: "pass" | "skipped";
  evidence: string;
}

export function runResult(gates: readonly GateResult[]): "pass" | "fail" {
  return gates.some((gate) => gate.status === "fail") ? "fail" : "pass";
}

const STATUS_LABEL: Record<GateStatus, string> = {
  pass: "PASS",
  fail: "FAIL",
  "n/a": "N.A.",
  waived: "WAIVED",
  skipped: "SKIPPED",
};

/** The report `verify` used to assemble by hand, rendered from what happened. */
export function renderTable(record: RunRecord): string {
  const rows = record.gates.map((gate) => {
    const evidence = gate.evidence ?? gate.reason ?? "";
    return `| ${gate.label} | \`${gate.command}\` | ${STATUS_LABEL[gate.status]} | ${escapeCell(evidence)} |`;
  });

  const notes = record.notes.map(
    (note) =>
      `| ${note.step} | (recorded) | ${note.status === "pass" ? "PASS" : "SKIPPED"} | ${escapeCell(note.evidence)} |`,
  );

  return [
    "| Gate | Command | Result | Evidence |",
    "| --- | --- | --- | --- |",
    ...rows,
    ...notes,
  ].join("\n");
}

/** A pipe in a tool's output would otherwise split the row it is quoted in. */
function escapeCell(text: string): string {
  return text.replace(/\|/g, "\\|");
}

/**
 * What the run did NOT cover. Green gates are one section of the definition of
 * done, and a report that ends at "all PASS" invites reading it as the whole
 * bar — which is how a branch gets merged with its docs never actualized.
 */
export function uncoveredBy(record: RunRecord): string[] {
  const left = [
    "browser smoke of the changed surfaces (the runner cannot open a page)",
    "docs actualization (docs/rules/docs.md)",
    "human review of the diff",
  ];
  const waived = record.gates
    .filter((gate) => gate.status === "waived")
    .map(
      (gate) => `${gate.label} — waived: ${gate.reason ?? "no reason given"}`,
    );
  const skipped = record.gates
    .filter((gate) => gate.status === "skipped")
    .map((gate) => `${gate.label} — never ran (an earlier gate failed)`);

  return [...waived, ...skipped, ...left];
}
