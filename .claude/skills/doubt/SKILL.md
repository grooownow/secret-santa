---
name: doubt
preamble-tier: 1
description: Cross-examines one non-trivial decision before it stands — states the claim, hands the bare artifact and its contract to a fresh-context skeptic instructed to disprove it, then reconciles what comes back. Use in flight, before committing a schema migration, an auth boundary, a concurrency or ordering assumption, or any irreversible operation; use when you catch yourself certain about code you did not write. NOT for a finished diff that needs a sweep (that is review) and NOT for a question the tests or the type checker already answer.
---

<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly. Regenerate: pnpm skills:gen -->

# Doubt

A confident answer is not a correct one. A long session accumulates context
that quietly turns assumptions into facts. This skill materializes a
reviewer with none of that context, biased to **disprove**, before a
non-trivial decision stands.

This is not the `review` skill. `review` is a verdict on a finished diff.
This is a posture in flight: the decision gets cross-examined while changing
course is still cheap.

## Ground rules

<!-- Generated from the shared preamble (scripts/lib/codegen.ts). Edit it there, not here. -->

- **Language:** chat with the user in the project's chat language
  (`docs/manifest.md` → _Chat language_; falls back to the language of the
  user's messages while unset). Every artifact that lives in the repo — code,
  docs, commit messages — is English.
- **Evidence, not adjectives.** Never report a command as green without quoting
  the line that proves it. "It should pass" is not a result, and the word
  _should_ in a status line is a red flag about your own honesty.

## When it applies

A decision is **non-trivial** when at least one is true:

- It asserts a property the compiler cannot check — idempotence, ordering,
  thread safety, an invariant across requests.
- Its blast radius is irreversible: an applied migration, a production
  deploy, a public API shape.
- It crosses the auth boundary or touches `src/middleware.ts`.
- Its correctness depends on context a future reader cannot see.

**Not for:** renames, formatting, file moves, one-line changes with obvious
correctness, following an unambiguous instruction, or reading code. If you
doubt every keystroke you ship nothing.

## One-way doors — always asked, never decided

Some decisions cannot be walked back, and for those the question is not "am I
confident?" — a confident wrong answer is exactly the failure mode. Whether a
decision is a one-way door is a **property of the decision, declared here**, not
a judgement you make in the moment about how sure you feel.

| Decision                                                        | Door    | Why                                                                              |
| --------------------------------------------------------------- | ------- | -------------------------------------------------------------------------------- |
| Applying a migration that drops or rewrites a column            | One-way | The data is gone. A rollback restores the schema, not the rows.                  |
| Changing an auth boundary (`requireUser`, middleware, session)  | One-way | The window between shipping and noticing is a window of exposure.                |
| A data-model fork — what the core entity _is_                   | One-way | Every later slice is written against it; changing it later rewrites all of them. |
| Deleting or rewriting user-visible history (force-push, squash) | One-way | The evidence of what happened is the thing being destroyed.                      |
| Anything with an irreversible external effect (payment, email)  | One-way | The side effect leaves the system and does not come back.                        |
| Naming, file layout, component structure                        | Two-way | Cheap to change; asking about each one is its own kind of failure.               |
| Which of two equivalent libraries, both already in the repo     | Two-way | Reversible in an afternoon. Decide, note it, move on.                            |

**A one-way door is asked of the user even when you are certain — especially
then.** Certainty is not a reason to skip the question; it is the condition
under which skipping it is most tempting and most expensive. Two-way doors you
decide yourself and record; stopping to ask about a variable name is not
caution, it is noise that trains the user to stop reading your questions.

When a decision is not in the table, ask one question: _if this is wrong, what
does it cost to undo?_ If the honest answer is "data, money, trust, or
history" — treat it as one-way.

## The cycle

Create a todo per step.

### Step 1 — CLAIM

Name the decision in two or three lines, plus why it matters.

```
CLAIM: dropping the `legacy_slug` column is safe — nothing reads it.
WHY IT MATTERS: an applied migration is irreversible against production data.
```

If you cannot write the claim that compactly, you have a vibe, not a
decision. Surface it before scrutinizing it.

### Step 2 — EXTRACT

Isolate the **artifact** and the **contract**. The artifact is the diff, the
function, or the proposal in 3–5 sentences. The contract is what it has to
satisfy — the spec section, the invariant, the rules file.

Strip your reasoning. Hand over conclusions and you get back validation of
your conclusions.

If the artifact is too big to hold in one read, it is too big to doubt.
Decompose it.

### Step 3 — DOUBT

Spawn a `general-purpose` subagent — it starts with no context by
construction, which is the whole point. Pass **ARTIFACT + CONTRACT only.
Never the CLAIM**: handing over your conclusion biases the reviewer toward
agreeing with it.

The prompt must be adversarial. Framing decides the answer:

```
Adversarial review. Find what is wrong with this artifact.
Assume the author is overconfident. Look for:
- unstated assumptions
- edge cases not handled
- hidden coupling or shared state
- ways the contract could be violated
- conventions in this repo it breaks
- failure modes under unexpected input

Do NOT validate. Do NOT summarize. Report issues, or state explicitly that
you found none after thorough examination.

ARTIFACT: <paste>
CONTRACT: <paste>
```

### Step 4 — RECONCILE

The reviewer's output is data, not verdict. You are still the orchestrator.
Re-read the artifact against each finding — rubber-stamping the reviewer is
the same failure as ignoring it. Classify each finding, first match wins:

1. **Contract misread** — the reviewer was flagging your unclear contract.
   Fix the contract, re-loop.
2. **Valid and actionable** — change the artifact, re-loop.
3. **Valid trade-off** — real, but the fix costs more than the risk. Say so
   out loud so the user sees the trade.
4. **Noise** — correct under context the reviewer lacked. Ask whether adding
   that context to the contract would have prevented the flag.

### Step 5 — STOP

Stop when the next cycle would return only trivial or already-considered
findings, **or** after 3 cycles, **or** when the user says ship it.

Three cycles that still surface substantive findings is information about
the artifact, not a reason to run a fourth alone. Surface it. If three feels
"obviously insufficient" because the artifact is large, the artifact is too
large — return to Step 2.

## Relationship to the other skills

- `review` — post-hoc verdict on a finished diff. Complementary, not
  redundant. Use both.
- `feature` — Step 3 invokes this skill before a migration or an auth change.
- `docs/rules/sources.md` — that rule verifies facts about _frameworks_. This
  skill verifies _your reasoning about the artifact_. One checks the API
  exists; the other checks you used it correctly.
- Test-driven development — a failing test is a disproof attempt made
  concrete. For a behavioral claim, the red test **is** the doubt step.

## Common rationalizations

| Rationalization                          | Reality                                                                                                            |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| "I'm confident, skip it"                 | Confidence correlates poorly with correctness on novel problems. Certainty is exactly where the blind spot lives.  |
| "Spawning a reviewer is expensive"       | Cheaper than the migration you cannot roll back. The check is bounded; the bug is not.                             |
| "The reviewer will just nitpick"         | Only if unscoped. Constrain it to "issues that would violate this contract".                                       |
| "I'll doubt at the end, with `review`"   | `review` is the final gate. By then the wrong direction is already built.                                          |
| "The reviewer disagreed, so I was wrong" | The reviewer lacks your context. Disagreement is information, not verdict. Re-read the artifact, classify, decide. |
| "If I doubt everything I'll never ship"  | Re-read "When it applies". Renames and formatting are explicitly out.                                              |

## Red flags

- Spawning a reviewer for a rename
- Passing the CLAIM to the reviewer, or passing your reasoning
- Prompting with "is this good?" instead of "find what is wrong"
- Treating the reviewer's output as authoritative without re-reading the code
- Looping past 3 cycles without escalating
- **Doubt theater:** across two or more cycles where the reviewer surfaced
  substantive findings, zero were classified actionable. You are validating,
  not doubting. Stop and escalate.
- Re-spawning a reviewer on an unchanged artifact — you will get the same
  findings; you are stalling
