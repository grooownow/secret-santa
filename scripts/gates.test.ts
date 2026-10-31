import { describe, expect, it } from "vitest";

import {
  evidenceFrom,
  planGates,
  renderTable,
  runResult,
  touchesSkillHarness,
  uncoveredBy,
  type GateResult,
  type RunRecord,
} from "./lib/gates";

const LANDING = new Set(["lint", "test", "test:e2e", "build"]);
const APP = new Set([...LANDING, "db:reset"]);

function plan(overrides: Partial<Parameters<typeof planGates>[0]> = {}) {
  return planGates({ scripts: LANDING, changedPaths: [], ...overrides });
}

function statusOf(gates: ReturnType<typeof planGates>, name: string) {
  return gates.find((gate) => gate.name === name)?.status;
}

describe("the plan decides what applies before anything runs", () => {
  it("marks db-reset n/a on a project with no such script", () => {
    expect(statusOf(plan(), "db-reset")).toBe("n/a");
  });

  it("leaves db-reset to run only when the script exists", () => {
    expect(statusOf(plan({ scripts: APP }), "db-reset")).toBeUndefined();
  });

  it("marks the skill harness n/a when the diff touches no skill or rule", () => {
    expect(
      statusOf(plan({ changedPaths: ["src/app/page.tsx"] }), "skills"),
    ).toBe("n/a");
  });

  it("runs the skill harness when the diff edits a skill, a fragment or a rule", () => {
    for (const file of [
      ".claude/skills/feature/SKILL.md.tmpl",
      ".claude/skill-steps/loop-budget.md",
      "docs/rules/testing.md",
      "CLAUDE.md",
    ]) {
      expect(
        statusOf(plan({ changedPaths: [file] }), "skills"),
        `${file} should make the skill harness apply`,
      ).toBeUndefined();
    }
  });

  it("keeps the sequence in cheapest-first order", () => {
    expect(plan().map((gate) => gate.name)).toEqual([
      "lint",
      "secrets",
      "test",
      "db-reset",
      "e2e",
      "build",
      "perf",
      "skills",
    ]);
  });

  it("keeps the Lighthouse budget opt-in — n/a without --full", () => {
    const gate = plan().find((g) => g.name === "perf");
    expect(gate?.status).toBe("n/a");
    expect(gate?.reason).toContain("--full");
  });

  it("runs the Lighthouse budget when --full opts in", () => {
    expect(statusOf(plan({ full: true }), "perf")).toBeUndefined();
  });

  it("always plans the secret scan — it has no opt-out", () => {
    expect(statusOf(plan(), "secrets")).toBeUndefined();
  });

  it("narrows the run to --only, without reordering it", () => {
    expect(plan({ only: ["build", "lint"] }).map((gate) => gate.name)).toEqual([
      "lint",
      "build",
    ]);
  });
});

describe("a waived gate is skipped loudly, never quietly", () => {
  it("records the user's reason on the gate", () => {
    const gates = plan({ waivers: { e2e: "no browser on this box" } });
    const e2e = gates.find((gate) => gate.name === "e2e");
    expect(e2e?.status).toBe("waived");
    expect(e2e?.reason).toBe("no browser on this box");
  });

  it("keeps waived distinct from n/a, so the ledger can tell them apart", () => {
    const gates = plan({ waivers: { "db-reset": "deliberate" } });
    // Same gate, opposite meanings: with no script it is a fact about the repo,
    // with a waiver it is a decision by a person.
    expect(statusOf(gates, "db-reset")).toBe("waived");
    expect(statusOf(plan(), "db-reset")).toBe("n/a");
  });

  it("lists waived and never-ran gates as not covered", () => {
    const record = recordOf([
      { name: "lint", label: "Lint", command: "pnpm lint", status: "pass" },
      {
        name: "e2e",
        label: "E2E",
        command: "pnpm test:e2e",
        status: "waived",
        reason: "no browser",
      },
      {
        name: "build",
        label: "Build",
        command: "pnpm build",
        status: "skipped",
      },
    ]);
    const uncovered = uncoveredBy(record).join("\n");
    expect(uncovered).toContain("E2E — waived: no browser");
    expect(uncovered).toContain("Build — never ran");
    expect(uncovered).toContain("browser smoke");
  });
});

describe("evidence is quoted from the command, not summarised", () => {
  it("quotes the last line of a passing run", () => {
    expect(evidenceFrom("compiling\n\n  4 passed (7.1s)\n", "pass")).toBe(
      "4 passed (7.1s)",
    );
  });

  it("quotes the result line, not the decoration a tool ends on", () => {
    // Both verbatim tails from this repo. Ending on the literal last line gave
    // "Duration 1.29s" and a legend row about ƒ — true, and worth nothing to a
    // reader asking whether the tests passed.
    const vitest = [
      " Test Files  22 passed (22)",
      "      Tests  234 passed (234)",
      "   Start at  13:34:31",
      "   Duration  1.29s (transform 791ms, setup 0ms)",
    ].join("\n");
    expect(evidenceFrom(vitest, "pass")).toBe("Tests  234 passed (234)");

    const build = [
      " ✓ Compiled successfully in 3.4s",
      "Route (app)",
      "┌ ○ /",
      "○  (Static)   prerendered as static content",
      "ƒ  (Dynamic)  server-rendered on demand",
    ].join("\n");
    expect(evidenceFrom(build, "pass")).toContain("Compiled successfully");
  });

  it("quotes the complaint on failure, not the runner's epilogue", () => {
    const output = [
      "running tests",
      "FAIL src/lib/env.test.ts > rejects a missing DATABASE_URL",
      "ELIFECYCLE Command failed with exit code 1.",
    ].join("\n");
    expect(evidenceFrom(output, "fail")).toContain("FAIL src/lib/env.test.ts");
  });

  it("skips the package runner's epilogue for the complaint above it", () => {
    // Verbatim shape of this repo's first red run of `pnpm gates`: prettier's
    // message is the only line that says anything, and it says it without a
    // failure word, one line above pnpm's shrug.
    const output = [
      "Checking formatting...",
      "[warn] Code style issues found in 3 files. Run Prettier with --write to fix.",
      "[ELIFECYCLE] Command failed with exit code 1.",
    ].join("\n");
    expect(evidenceFrom(output, "fail")).toContain("Code style issues found");
  });

  it("says so when a command printed nothing", () => {
    expect(evidenceFrom("   \n\n", "pass")).toBe("(no output)");
  });

  it("truncates a wall of output instead of pasting it into the table", () => {
    const line = "x".repeat(500);
    const evidence = evidenceFrom(line, "pass");
    expect(evidence.length).toBeLessThan(250);
    expect(evidence.endsWith("…")).toBe(true);
  });
});

describe("the report is rendered from what happened", () => {
  it("renders one row per gate with its status label", () => {
    const table = renderTable(
      recordOf([
        {
          name: "lint",
          label: "Lint",
          command: "pnpm lint",
          status: "pass",
          evidence: "All matched files use Prettier code style!",
        },
        {
          name: "e2e",
          label: "E2E",
          command: "pnpm test:e2e",
          status: "fail",
          evidence: "1 failed",
        },
      ]),
    );
    expect(table).toContain("| Lint | `pnpm lint` | PASS |");
    expect(table).toContain("| E2E | `pnpm test:e2e` | FAIL | 1 failed |");
  });

  it("escapes a pipe so a tool's output cannot split the row", () => {
    const table = renderTable(
      recordOf([
        {
          name: "lint",
          label: "Lint",
          command: "pnpm lint",
          status: "fail",
          evidence: "a | b",
        },
      ]),
    );
    expect(table).toContain("a \\| b");
    expect(table.split("\n").filter((row) => row.startsWith("|"))).toHaveLength(
      3,
    );
  });

  it("renders recorded judgment steps alongside the gates", () => {
    const record = recordOf([
      { name: "lint", label: "Lint", command: "pnpm lint", status: "pass" },
    ]);
    record.notes.push({
      at: "2026-07-31T10:00:00.000Z",
      step: "new test proven able to fail",
      status: "pass",
      evidence: "broke the assertion, saw it red, restored",
    });
    expect(renderTable(record)).toContain("| new test proven able to fail |");
  });

  it("fails the run when any gate failed, and only then", () => {
    const gates: GateResult[] = [
      { name: "lint", label: "Lint", command: "pnpm lint", status: "pass" },
      { name: "e2e", label: "E2E", command: "pnpm test:e2e", status: "waived" },
    ];
    expect(runResult(gates)).toBe("pass");
    expect(runResult([...gates, { ...gates[0]!, status: "fail" }])).toBe(
      "fail",
    );
  });
});

describe("the skill-harness path check", () => {
  it("does not fire on a path that merely mentions a rules directory", () => {
    // Proving the check can fail: a prefix match, not a substring match.
    expect(touchesSkillHarness(["src/docs/rules/thing.ts"])).toBe(false);
    expect(touchesSkillHarness(["docs/rules/thing.md"])).toBe(true);
  });
});

function recordOf(gates: GateResult[]): RunRecord {
  return {
    id: "test-run",
    startedAt: "2026-07-31T10:00:00.000Z",
    finishedAt: "2026-07-31T10:01:00.000Z",
    branch: "test",
    head: "abc1234",
    scope: "test",
    gates,
    notes: [],
    result: runResult(gates),
  };
}
