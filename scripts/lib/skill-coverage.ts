/**
 * The coverage floor for the skill suite: every skill ships with at least one
 * CI-blocking check, and no skill silently grows.
 *
 * The failure mode this exists to prevent is not a broken skill — Tier 1
 * (validate-skills.ts) and Tier 2 (skill-evals.ts) already catch those. It is a
 * skill that arrives *uncovered*: a new directory under .claude/skills/ with a
 * SKILL.md, no evals.json, and nothing in CI that would notice. Tier 2 would
 * flag the missing evals file, but only once someone runs it against a skill it
 * already knows about; nothing forces a human to say, out loud and in a file,
 * "here is what proves this skill works". SKILL_COVERAGE is that file. It is
 * deliberately hand-maintained: an auto-derived registry would happily register
 * a skill nobody has thought about, which is exactly the state we are trying to
 * make impossible.
 *
 * The size budget is the other half. A skill's body is loaded into the agent's
 * context every time it fires, so bytes are a running cost, and the shared
 * preamble (scripts/lib/codegen.ts) is a multiplier — one honest edit there
 * lands in every Tier-2 skill at once. Nobody reviews a +40-line diff across
 * all those generated files as a *token* regression, because it does not look
 * like one.
 * The baseline makes it look like one.
 */
import { readFileSync, statSync } from "node:fs";
import path from "node:path";

/** Committed byte counts for every generated SKILL.md. Regenerate deliberately. */
export const BASELINE_FILE = path.join(
  process.cwd(),
  "scripts",
  "fixtures",
  "skill-size-baseline.json",
);

/**
 * 50% headroom over the committed baseline. Loose enough that a real edit to a
 * skill is not a fight with the harness; tight enough that a preamble change
 * that doubles every skill cannot land unnoticed.
 */
export const DEFAULT_SIZE_BUDGET_RATIO = 1.5;

/**
 * Skill name -> what proves it works.
 *
 * One line each, naming a *specific* artifact, not a promise. "It has tests" is
 * not an entry; "evals.json trigger cases + Tier 2 routing" is. When a skill
 * graduates from a deterministic check to a fixture-backed behavioral one, this
 * is the line that changes — and the diff is the record of the promotion.
 */
export const SKILL_COVERAGE: Readonly<Record<string, string>> = {
  // The taste store is the only part of this skill a machine can grade today:
  // decay, rejection, and determinism are arithmetic, and scripts/lib/taste.test.ts
  // proves each of them can fail. Everything the skill does with a browser — the
  // variant spread, the comparison board, the breakpoint pass — is graded by a
  // human looking at a screenshot, and saying so here is cheaper than pretending
  // otherwise in a fixture that only asserts the agent said the right words.
  design:
    "Tier 1 structure + Tier 2 routing (evals.json) + unit coverage of the decaying taste profile it writes (scripts/lib/taste.test.ts); the browser half of the loop has no fixture — it is reviewed by eye.",
  deploy:
    "Tier 1 structure + Tier 2 routing (evals.json); the playbook it drives (docs/playbooks/deploy.md) is exercised by the golden-path CI job's build.",
  doubt:
    "Tier 1 structure + Tier 2 routing (evals.json); tier-1 preamble asserted by scripts/gen-skills.test.ts (no rules map in its context).",
  feature:
    "Tier 1 structure + Tier 2 routing (evals.json); every `pnpm <script>` it names is proven to exist by scripts/gen-skills.test.ts.",
  // Honest, and therefore uncomfortable: `learn` has no fixture-backed check.
  // Tier 1 and Tier 2 prove it loads and routes; nothing proves it curates well.
  // That is what an entry looks like when the coverage is thin — the registry's
  // job is to make that visible, not to launder it.
  learn:
    "Tier 1 structure + Tier 2 routing (evals.json) ONLY — no behavioral fixture yet; the next detection eval after `review` should be this one.",
  review:
    "Tier 1 structure + Tier 2 routing (evals.json) + Tier 3 detection rate against tests/fixtures/planted-defects (scripts/skill-detection-eval.ts, run locally on demand — not in CI, see that file for why).",
  verify:
    "Tier 1 structure + Tier 2 routing (evals.json); the gate sequence it runs IS the CI quality job, so a drifted command turns CI red.",
};

/**
 * Not `NodeJS.ProcessEnv`: this repo pulls in next-env.d.ts, which makes
 * NODE_ENV a *required* key, so a test could not hand these functions a small
 * literal env without inventing one.
 */
export type Env = Record<string, string | undefined>;

/** Env override for the budget, so a deliberate rewrite is a flag, not an edit. */
export function sizeBudgetRatio(env: Env = process.env): number {
  const raw = env.SKILL_SIZE_BUDGET_RATIO;
  if (!raw) return DEFAULT_SIZE_BUDGET_RATIO;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(
      `SKILL_SIZE_BUDGET_RATIO must be a positive number, got '${raw}'`,
    );
  }
  return parsed;
}

export function loadBaseline(
  file: string = BASELINE_FILE,
): Record<string, number> {
  return JSON.parse(readFileSync(file, "utf8")) as Record<string, number>;
}

export function skillSizeBytes(file: string): number {
  return statSync(file).size;
}

/**
 * Both directions matter. A skill missing from the registry is the headline
 * case; a registry entry for a deleted skill is the quieter one — it makes the
 * suite look better covered than it is, and it is the state a rename leaves
 * behind.
 */
export function checkRegistry(
  skillDirs: string[],
  registry: Readonly<Record<string, string>> = SKILL_COVERAGE,
): string[] {
  const errors: string[] = [];
  const known = new Set(Object.keys(registry));

  for (const dir of skillDirs) {
    if (!known.has(dir)) {
      errors.push(
        `${dir}: not in SKILL_COVERAGE (scripts/lib/skill-coverage.ts) — say what proves this skill works before it ships`,
      );
      continue;
    }
    if (!registry[dir]?.trim()) {
      errors.push(`${dir}: SKILL_COVERAGE entry is empty`);
    }
  }

  const present = new Set(skillDirs);
  for (const name of known) {
    if (!present.has(name)) {
      errors.push(
        `${name}: listed in SKILL_COVERAGE but has no directory under .claude/skills/ — a stale entry overstates coverage`,
      );
    }
  }

  return errors;
}

/**
 * The eval file's shape, asserted structurally rather than by running the
 * harness. Tier 2 (skill-evals.ts) demands the same minimums, but it demands
 * them *while grading*: a skill added with no evals.json fails there only when
 * someone runs `pnpm skills:evals`. Here it fails at `pnpm test`, in the same
 * breath as the rest of the suite, which is the difference between a gate and a
 * reminder.
 *
 * The `owner` requirement on negatives is the one line that goes beyond Tier 2.
 * A negative trigger with no owner asserts only "this prompt is not mine",
 * which every irrelevant sentence in English satisfies. Naming the skill that
 * SHOULD win turns it into a pairwise routing test — the only kind that catches
 * two descriptions drifting into each other.
 */
export interface EvalCoverage {
  trigger?: {
    positive?: unknown[];
    negative?: { owner?: string }[];
  };
  evals?: unknown[];
}

export function checkEvalCoverage(
  dir: string,
  entry: EvalCoverage | undefined,
  minimums: { positive: number; negative: number; evals: number },
): string[] {
  if (!entry) {
    return [
      `${dir}: no evals.json — a skill with no evals is a skill nothing in CI can fail on`,
    ];
  }

  const errors: string[] = [];
  const positive = entry.trigger?.positive ?? [];
  const negative = entry.trigger?.negative ?? [];
  const evals = entry.evals ?? [];

  if (positive.length < minimums.positive) {
    errors.push(
      `${dir}: needs at least ${minimums.positive} positive triggers, has ${positive.length}`,
    );
  }
  if (negative.length < minimums.negative) {
    errors.push(
      `${dir}: needs at least ${minimums.negative} negative triggers, has ${negative.length}`,
    );
  }
  negative.forEach((testCase, index) => {
    if (!testCase?.owner?.trim()) {
      errors.push(
        `${dir}: negative trigger ${index + 1} names no 'owner' — a negative that says only "not mine" tests nothing`,
      );
    }
  });
  if (evals.length < minimums.evals) {
    errors.push(
      `${dir}: needs at least ${minimums.evals} behavioral eval, has ${evals.length}`,
    );
  }

  return errors;
}

export function checkSizeBudget(
  sizes: Record<string, number>,
  baseline: Record<string, number>,
  ratio: number = DEFAULT_SIZE_BUDGET_RATIO,
): string[] {
  const errors: string[] = [];

  for (const [name, bytes] of Object.entries(sizes)) {
    const base = baseline[name];
    if (base === undefined) {
      errors.push(
        `${name}: no entry in scripts/fixtures/skill-size-baseline.json — add its real byte count, do not let the harness invent one`,
      );
      continue;
    }
    const budget = Math.round(base * ratio);
    if (bytes > budget) {
      errors.push(
        `${name}/SKILL.md is ${bytes} bytes, over the ${budget}-byte budget (${base} baseline x ${ratio}) — every firing of this skill now costs that much more context`,
      );
    }
  }

  for (const name of Object.keys(baseline)) {
    if (!(name in sizes)) {
      errors.push(
        `${name}: in the size baseline but no longer a skill — drop the stale entry`,
      );
    }
  }

  return errors;
}
