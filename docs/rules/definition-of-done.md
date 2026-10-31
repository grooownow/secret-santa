# Definition of Done

**Applies to:** every change, without exception — this is the standing bar, and
the one rules file that is never out of scope.

Acceptance criteria and the Definition of Done answer different questions.
Acceptance criteria live in a spec, change per feature, and answer "did we
build _this thing_?". The Definition of Done is the same every time and
answers "is it _ready_?". A slice is done when **both** are satisfied.

This file is the standing bar. It does not restate the per-rule gates — each
rules file owns its own checklist, and this file points at them.

## Delegated gates (run the file's own checklist)

| Question                                          | Owner                        |
| ------------------------------------------------- | ---------------------------- |
| Slice shape, import direction, migrations         | `docs/rules/architecture.md` |
| Responsiveness, tokens, loading states, a11y      | `docs/rules/frontend.md`     |
| Right test level, anti-flaky, proven able to fail | `docs/rules/testing.md`      |
| Validation, env vars, secrets, auth               | `docs/rules/security.md`     |
| Commit format, branch, what not to commit         | `docs/rules/git.md`          |
| Manifest, roadmap, spec status, ADRs              | `docs/rules/docs.md`         |
| Framework claims cited, not remembered            | `docs/rules/sources.md`      |

## The standing checklist

Everything below is cross-cutting: no single rules file owns it, and every
change is measured against it.

### Correctness

- [ ] Every acceptance criterion in the spec is met — and nothing outside
      the spec's Scope snuck in
- [ ] The behavior was observed **at runtime**, not merely compiled and
      typechecked. A green `tsc` is not evidence that a page renders
- [ ] Edge cases and error paths from the spec are exercised, not just the
      happy path
- [ ] `pnpm gates` green — it runs lint → secrets → test → (db:reset) → e2e →
      build → (perf, with `--full`) →
      (skill harness) in that order, stops at the first failure, and renders
      the PASS/FAIL table from exit codes rather than from anyone's account of
      them. It writes each run to `.gridfin/runs/<id>.json`, so "were the gates
      actually run on that branch?" stays answerable after the session ends
      (`pnpm gates:show`). A gate the user chose to skip is
      `--waive <gate>="reason"`: recorded, printed, never silently absent.
- [ ] Steps no command can check — a test watched failing, a page seen
      rendering — are recorded on the run with `pnpm gates:note`. The ledger is
      not proof that they happened; it is what makes their absence visible.

### Quality

- [ ] The code reads like the code around it — same naming, same idiom, same
      comment density
- [ ] No duplicated business logic, no dead code, no debug output, no
      commented-out blocks
- [ ] No unrelated refactor rode along in the diff

### Integration

- [ ] Migrations, config changes, and new env vars are accounted for and
      applied to a fresh database (`pnpm db:reset` still works)
- [ ] Backward compatibility considered for any public interface

### Ship-readiness

- [ ] Docs match reality per `docs/rules/docs.md`'s actualization rule
- [ ] A real decision made along the way is recorded as an ADR
- [ ] The human has reviewed and approved before merge or deploy

## How it is applied

- **Per step** of the `feature` skill: Correctness and Quality.
- **Per slice**, before merge: the whole file. `feature` Step 6 walks it.
- **Per release**: the whole file is the floor; `docs/playbooks/deploy.md`
  adds the deploy-specific gates on top.

Tailor this list once, then reuse it unchanged. A Definition of Done that is
renegotiated per feature is not a Definition of Done.

## Common rationalizations

| Rationalization                                             | Reality                                                                                                                 |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| "It's done, I just haven't run it yet"                      | Unverified work is not done. Runtime observation is a checkbox above, not a formality.                                  |
| "Tests pass, so it's done"                                  | Tests are one line of the checklist. Docs, runtime behavior, and human approval are others.                             |
| "The deadline is tight, we'll apply the full bar next time" | A bar that moves with schedule pressure is not a bar. Cut scope instead — that is what the spec's Scope section is for. |
| "Acceptance criteria are met, that's the whole bar"         | Acceptance criteria answer "the right thing?"; this file answers "ready?". Both, every time.                            |

## Red flags

- "Done" declared before a human has looked at anything
- A gate skipped because "it was green last time"
- A diff that satisfies the spec and also refactors three unrelated files
- Docs updated in the same breath as the code being called done, as an
  afterthought rather than a step
