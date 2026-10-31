# Rule: Skills

**Applies to:** any change under `.claude/skills/**`, `.claude/skill-steps/**`,
or the compiler that builds them (`scripts/lib/codegen.ts`,
`scripts/gen-skills.ts`). The skills are the product — this is the contract they
are written against.

## The authored source is the template

`SKILL.md` is generated from `SKILL.md.tmpl` by `pnpm skills:gen`. Edit the
template, never the output; `pnpm skills:check` fails the build on a hand-edited
generated file, which is what makes the compiler trustworthy at all.

Two kinds of shared text exist, and they are not interchangeable:

- **`{{PREAMBLE}}`** — what _every_ skill (tier 1) or every code-touching skill
  (tier 2) is told: chat language, the evidence rule, the hard invariants, the
  rules map. Tiered so a skill that writes nothing does not carry the
  architecture rules in its context.
- **`{{STEP_*}}`** — a step fragment from `.claude/skill-steps/<name>.md`, for a
  rule that governs _some_ skills. A fragment earns its file when more than one
  skill needs the same rule **verbatim**. If a skill would have to qualify it
  ("except here we commit per version"), the rule belongs in that skill, in its
  own words — a fragment re-explained at every call site is worse than the
  duplication it replaced.

A fragment nobody references is dead weight and fails `pnpm test`.

## Descriptions route — both halves of them

The description is injected into the agent's system prompt and is the only
thing deciding whether a skill loads. Every one carries:

1. **A trigger clause** — "Use when …", in the words a user actually says
   (enforced by `pnpm skills:validate`).
2. **A negative clause** — "NOT for X (that is `<skill>`)" for each neighbour it
   is genuinely confusable with. Two skills that both sound right for a prompt
   is a routing bug, and the negative half is what resolves it.

Every "NOT for" claim is backed by a **negative trigger case** in the skill's
`evals.json` naming the owning skill. A claim in prose that no eval can fail on
is a wish. Minimums per skill (`scripts/skill-evals.ts`): 3 positive triggers,
2 negatives, 1 behavioral eval.

`pnpm skills:evals` ranks lexically, so it also catches the failure mode this
rule invites: a negative clause written with so much of the neighbour's
vocabulary that it pulls that neighbour's prompts to itself.

## Every loop declares its bound

A fix-and-retry loop states its exit condition and its cap — two honest attempts
at the same failure — and what happens when the cap is hit: stop, report the
command output, hand the decision back. The shared wording is
`.claude/skill-steps/loop-budget.md`; a skill that loops references it rather
than inventing its own budget.

A loop that waits on a **person** is exempt from the cap and owes a resume rule
instead (below). Unbounded-by-omission is the state this rule exists to prevent:
before it, only `feature` named a retry budget, so every other skill's fix loop
was infinite by accident rather than by decision.

## Human checkpoints are named, with a resume rule

Wherever a skill stops for a person — an approval gate, a design pick, a
one-question fork — say so in the skill, and say where the flow resumes if the
session drops before the answer arrives. A dropped session is the normal case;
the expensive failure is resuming _past_ an unanswered question because the code
already looks finished.

Existing patterns to copy rather than reinvent: `gridfin`'s `gridfin:fill`
markers and step-numbered commits, `feature`'s resume protocol and its
`NO UNRESOLVED DECISIONS` sentinel.

## Fresh context is a technique, not an accident

Some steps are worth more in a session that has not already argued itself into a
position: cross-examining a decision (`doubt` hands the artifact to a
fresh-context skeptic by design), and reviewing a diff the same session just
spent hours writing. Where a step depends on that, the skill says so explicitly —
"run this in a fresh session, with only the artifact and its contract" — because
an agent that has been defending a choice for an hour is the worst available
judge of it.

## Context costs money — the size budget is real

A skill's body is loaded on every firing. `scripts/fixtures/skill-size-baseline.json`
holds the committed byte count per generated `SKILL.md`, and a skill may grow to
1.5× its baseline before `pnpm test` goes red. Growing past that is a decision:
regenerate the baseline deliberately, in the same commit, so the diff shows the
cost was accepted rather than drifted into.

## Gates (self-check before done)

- [ ] Edited the `.tmpl`, ran `pnpm skills:gen`, committed both files
- [ ] `pnpm skills:check && pnpm skills:validate && pnpm skills:evals` green
- [ ] New "NOT for" claim has a negative eval case naming the owner
- [ ] New loop states its cap and its exhaustion behavior
- [ ] New human checkpoint states where a dropped session resumes
- [ ] Baseline regenerated in the same commit if a skill grew past budget
