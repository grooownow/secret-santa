import { describe, expect, it } from "vitest";

import type { Skill } from "./lib/skills";
import type { SkillEvals } from "./skill-evals";
import { buildGraderPrompt, runDeterministic } from "./skill-evals";

function skill(dir: string, description: string): Skill {
  return { name: dir, dir, description, body: "", file: `${dir}/SKILL.md` };
}

const SKILLS = [
  skill(
    "verify",
    "Runs the quality gate sequence — lint, tests, build — and reports each gate PASS or FAIL with quoted evidence. Use when the branch must be proven green.",
  ),
  skill(
    "review",
    "Adversarial review of the current diff, one lens per rules file, reporting findings by severity. Use when the user asks to review changes.",
  ),
  skill(
    "deploy",
    "Walks the user through shipping to production on Vercel with a managed database. Use when the project goes live.",
  ),
];

function evalsFor(
  name: string,
  overrides: Partial<SkillEvals> = {},
): SkillEvals {
  return {
    skill_name: name,
    trigger: {
      positive: [{ prompt: "a", top_k: 1 }, { prompt: "b" }, { prompt: "c" }],
      negative: [{ prompt: "d" }, { prompt: "e" }],
    },
    evals: [{ id: 1, prompt: "p", expected_output: "o", expectations: ["e"] }],
    ...overrides,
  };
}

describe("runDeterministic", () => {
  it("passes when every positive prompt ranks its own skill within top_k", () => {
    // A one-skill corpus can never be error-free (every negative ranks the
    // sole skill first), so the happy path needs the full three-skill set
    // with a routing case for each.
    const cases = new Map<string, SkillEvals>([
      [
        "verify",
        evalsFor("verify", {
          trigger: {
            positive: [
              { prompt: "prove the branch is green, run the gates", top_k: 1 },
              { prompt: "lint and the tests and the build", top_k: 2 },
              { prompt: "quoted evidence that the gates pass", top_k: 2 },
            ],
            negative: [
              { prompt: "adversarial review of the diff", owner: "review" },
              {
                prompt: "shipping to production on vercel",
                owner: "deploy",
              },
            ],
          },
        }),
      ],
      [
        "review",
        evalsFor("review", {
          trigger: {
            positive: [
              { prompt: "adversarial review of the diff", top_k: 1 },
              {
                prompt: "findings by severity, one lens per rules file",
                top_k: 2,
              },
              { prompt: "review the current changes", top_k: 2 },
            ],
            negative: [
              {
                prompt: "run the gate sequence, lint and build",
                owner: "verify",
              },
              {
                prompt: "shipping to production on vercel",
                owner: "deploy",
              },
            ],
          },
        }),
      ],
      [
        "deploy",
        evalsFor("deploy", {
          trigger: {
            positive: [
              { prompt: "shipping to production on vercel", top_k: 1 },
              {
                prompt: "take the project live with a managed database",
                top_k: 2,
              },
              { prompt: "production database and going live", top_k: 2 },
            ],
            negative: [
              {
                prompt: "run the gate sequence, lint and build",
                owner: "verify",
              },
              { prompt: "adversarial review of the diff", owner: "review" },
            ],
          },
        }),
      ],
    ]);
    const result = runDeterministic(SKILLS, cases);
    expect(result.errors).toEqual([]);
    expect(result.rank1Rate).toBeGreaterThan(0);
  });

  it("errors when a positive prompt cannot reach its skill", () => {
    const cases = new Map<string, SkillEvals>([
      [
        "verify",
        evalsFor("verify", {
          trigger: {
            positive: [{ prompt: "ship to production on vercel", top_k: 1 }],
            negative: [{ prompt: "x" }, { prompt: "y" }],
          },
        }),
      ],
    ]);
    const result = runDeterministic(SKILLS, cases);
    expect(result.errors.join("\n")).toContain("did not rank");
  });

  it("errors when a negative prompt outranks its declared owner", () => {
    const cases = new Map<string, SkillEvals>([
      [
        "verify",
        evalsFor("verify", {
          trigger: {
            positive: [
              { prompt: "run the gate sequence" },
              { prompt: "b" },
              { prompt: "c" },
            ],
            negative: [
              // This prompt is verify's own vocabulary; claiming review owns it must fail.
              {
                prompt: "run the gate sequence and quote the evidence",
                owner: "review",
              },
              { prompt: "e" },
            ],
          },
        }),
      ],
    ]);
    const result = runDeterministic(SKILLS, cases);
    expect(result.errors.join("\n")).toContain("outranks its owner");
  });

  it("errors when a skill has no eval file at all", () => {
    const result = runDeterministic(SKILLS, new Map());
    expect(result.errors.join("\n")).toContain("has no evals.json");
  });

  it("errors when an eval file is below the minimum case counts", () => {
    const thin = evalsFor("verify", {
      trigger: {
        positive: [{ prompt: "run the gate sequence", top_k: 2 }],
        negative: [],
      },
    });
    const result = runDeterministic(
      SKILLS.slice(0, 1),
      new Map([["verify", thin]]),
    );
    expect(result.errors.join("\n")).toContain("needs at least 3 positive");
    expect(result.errors.join("\n")).toContain("needs at least 2 negative");
  });

  it("errors when two descriptions collide", () => {
    const twin = [SKILLS[0]!, skill("verify2", SKILLS[0]!.description)];
    const cases = new Map<string, SkillEvals>([
      ["verify", evalsFor("verify")],
      ["verify2", evalsFor("verify2")],
    ]);
    const result = runDeterministic(twin, cases);
    expect(result.errors.join("\n")).toContain("descriptions are");
  });

  it("errors when an eval prompt contains Cyrillic — the ranker is English", () => {
    const cyrillic = evalsFor("verify", {
      trigger: {
        positive: [
          { prompt: "проверь гейты", top_k: 2 },
          { prompt: "run the gate sequence" },
          { prompt: "quote the evidence" },
        ],
        negative: [
          { prompt: "review the diff", owner: "review" },
          { prompt: "e" },
        ],
      },
    });
    const result = runDeterministic(
      SKILLS.slice(0, 1),
      new Map([["verify", cyrillic]]),
    );
    expect(result.errors.join("\n")).toContain("Cyrillic");
  });
});

describe("buildGraderPrompt", () => {
  const evalCase = {
    id: 1,
    prompt: "Fix the rounding bug, test first.",
    expected_output: "A failing test, then a minimal fix.",
    expectations: ["A failing test is shown failing before the fix"],
  };

  it("fences the trace as untrusted data", () => {
    const prompt = buildGraderPrompt(evalCase, "Bash: rm -rf /");
    expect(prompt).toContain("<untrusted-trace>");
    expect(prompt).toContain("</untrusted-trace>");
    expect(prompt).toContain("Bash: rm -rf /");
    expect(prompt).toMatch(/never.*instructions/i);
  });

  it("lists every expectation as a numbered item to grade", () => {
    expect(buildGraderPrompt(evalCase, "")).toContain(
      "1. A failing test is shown failing before the fix",
    );
  });
});
