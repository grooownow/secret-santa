/**
 * The coverage floor: no skill ships without something in CI that can fail on it.
 *
 * Everything here is deterministic and free, so it runs on every push inside
 * `pnpm test`. It is the cheap half of the skill harness — it cannot tell you a
 * skill is good, only that a human has said, in a committed file, what would
 * prove it. The expensive half (an agent actually running the skill against
 * planted defects) is scripts/skill-detection-eval.ts, run locally on demand —
 * see that file for why it is not a CI job.
 *
 * Two failure modes are being closed:
 *
 *   1. **The silent uncovered skill.** Someone adds .claude/skills/<new>/ with a
 *      SKILL.md and nothing else. Tier 2 would notice the missing evals.json —
 *      but only when someone remembers to run it against a skill it does not yet
 *      know. Here the build goes red on the same commit.
 *   2. **Silent bloat.** A skill's body is context, and context is a per-firing
 *      cost. The shared preamble multiplies every edit by six. A +40-line
 *      preamble change reads like a docs commit and lands like a token
 *      regression, so the budget below makes it read like one too.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  checkEvalCoverage,
  checkRegistry,
  checkSizeBudget,
  loadBaseline,
  SKILL_COVERAGE,
  sizeBudgetRatio,
  skillSizeBytes,
  type EvalCoverage,
} from "./lib/skill-coverage";
import { loadSkills, loadSkillSources, SKILLS_DIR } from "./lib/skills";
import { MIN_EVALS, MIN_NEGATIVE, MIN_POSITIVE } from "./skill-evals";

const MINIMUMS = {
  positive: MIN_POSITIVE,
  negative: MIN_NEGATIVE,
  evals: MIN_EVALS,
};

const sources = loadSkillSources(SKILLS_DIR);
const generated = loadSkills(SKILLS_DIR);
const skillDirs = sources.map((skill) => skill.dir);

function readEvals(dir: string): EvalCoverage | undefined {
  const file = path.join(SKILLS_DIR, dir, "evals.json");
  if (!existsSync(file)) return undefined;
  return JSON.parse(readFileSync(file, "utf8")) as EvalCoverage;
}

describe("every skill ships as a template plus a generated body", () => {
  it("finds at least one skill (a green run on an empty dir proves nothing)", () => {
    expect(skillDirs.length).toBeGreaterThan(0);
  });

  it("pairs every SKILL.md.tmpl with a generated SKILL.md", () => {
    // loadSkillSources throws on a dir with no template, loadSkills on one with
    // no generated file; asserting the dir lists match closes the third case —
    // a template and a body that belong to different sets of directories.
    expect(generated.map((skill) => skill.dir)).toEqual(skillDirs);
  });
});

describe("every skill carries evals CI can fail on", () => {
  it.each(skillDirs)("%s: evals.json meets the structural minimums", (dir) => {
    expect(checkEvalCoverage(dir, readEvals(dir), MINIMUMS)).toEqual([]);
  });
});

describe("no silent uncovered skill", () => {
  it("names every skill in SKILL_COVERAGE, and nothing that is not a skill", () => {
    expect(checkRegistry(skillDirs, SKILL_COVERAGE)).toEqual([]);
  });
});

describe("skills stay inside their size budget", () => {
  it("holds every generated SKILL.md under the committed baseline x the ratio", () => {
    const sizes = Object.fromEntries(
      generated.map((skill) => [skill.dir, skillSizeBytes(skill.file)]),
    );
    expect(checkSizeBudget(sizes, loadBaseline(), sizeBudgetRatio())).toEqual(
      [],
    );
  });

  it("reads the ratio from the env so a deliberate rewrite is a flag, not an edit", () => {
    expect(sizeBudgetRatio({})).toBe(1.5);
    expect(sizeBudgetRatio({ SKILL_SIZE_BUDGET_RATIO: "3" })).toBe(3);
    expect(() => sizeBudgetRatio({ SKILL_SIZE_BUDGET_RATIO: "nope" })).toThrow(
      /positive number/,
    );
  });
});

/**
 * The detectors above are only worth their line count if they fire. Each case
 * below feeds a synthetic *bad* input to the same function the gate uses, so a
 * refactor that quietly turns a check into a no-op fails here instead of
 * passing everywhere.
 */
describe("the detectors actually fire (proving these tests can fail)", () => {
  it("catches a skill that exists but is absent from the registry", () => {
    const errors = checkRegistry(
      [...skillDirs, "shiny-new-skill"],
      SKILL_COVERAGE,
    );
    expect(errors.join("\n")).toContain(
      "shiny-new-skill: not in SKILL_COVERAGE",
    );
  });

  it("catches a registry entry whose skill no longer exists", () => {
    const errors = checkRegistry(skillDirs, {
      ...SKILL_COVERAGE,
      "deleted-skill": "nothing, it is gone",
    });
    expect(errors.join("\n")).toContain(
      "deleted-skill: listed in SKILL_COVERAGE",
    );
  });

  it("catches an empty registry entry — a placeholder is not coverage", () => {
    const errors = checkRegistry(["review"], { review: "  " });
    expect(errors.join("\n")).toContain("entry is empty");
  });

  it("catches a skill whose evals.json is missing entirely", () => {
    const errors = checkEvalCoverage("newbie", undefined, MINIMUMS);
    expect(errors.join("\n")).toContain("no evals.json");
  });

  it("catches thin triggers and a negative with no owner", () => {
    const errors = checkEvalCoverage(
      "thin",
      {
        trigger: {
          positive: [{ prompt: "a" }],
          negative: [{ owner: "verify" }, {}],
        },
        evals: [],
      },
      MINIMUMS,
    );
    const text = errors.join("\n");
    expect(text).toContain("needs at least 3 positive triggers, has 1");
    expect(text).toContain("negative trigger 2 names no 'owner'");
    expect(text).toContain("needs at least 1 behavioral eval, has 0");
  });

  it("catches a skill that grew past its budget", () => {
    const errors = checkSizeBudget({ review: 20_000 }, { review: 10_000 }, 1.5);
    expect(errors.join("\n")).toContain("over the 15000-byte budget");
  });

  it("lets a skill grow up to, but not past, the budget", () => {
    expect(
      checkSizeBudget({ review: 15_000 }, { review: 10_000 }, 1.5),
    ).toEqual([]);
    expect(
      checkSizeBudget({ review: 15_001 }, { review: 10_000 }, 1.5),
    ).not.toEqual([]);
  });

  it("refuses to invent a baseline for a skill that has none", () => {
    const errors = checkSizeBudget({ brandnew: 1_000 }, {}, 1.5);
    expect(errors.join("\n")).toContain(
      "no entry in scripts/fixtures/skill-size-baseline.json",
    );
  });

  it("catches a stale baseline entry for a deleted skill", () => {
    const errors = checkSizeBudget({}, { gone: 1_000 }, 1.5);
    expect(errors.join("\n")).toContain("no longer a skill");
  });
});
