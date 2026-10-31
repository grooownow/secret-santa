---
name: verify
preamble-tier: 2
description: Runs the full quality-gate sequence — pnpm lint, pnpm test, pnpm test:e2e, pnpm build — plus a browser smoke check of the surfaces changed in the current diff, and reports each gate PASS/FAIL with quoted command output as evidence. Use before merging a branch, as the gate step of the feature skill, or whenever the user asks to verify the project ("run verify", "are the gates green?"). NOT for fixing what a gate reports — the caller owns the fix — and NOT for judging code quality, which is review's job.
---

<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly. Regenerate: pnpm skills:gen -->

# Verify

Drive every gate, in order, and report what actually happened. This skill
produces evidence, not opinions: a gate is PASS only when its command exited
0 and you can quote the line that proves it.

## Ground rules

<!-- Generated from the shared preamble (scripts/lib/codegen.ts). Edit it there, not here. -->

- **Language:** chat with the user in the project's chat language
  (`docs/manifest.md` → _Chat language_; falls back to the language of the
  user's messages while unset). Every artifact that lives in the repo — code,
  docs, commit messages — is English.
- **Evidence, not adjectives.** Never report a command as green without quoting
  the line that proves it. "It should pass" is not a result, and the word
  _should_ in a status line is a red flag about your own honesty.
- **The hard invariants** (`AGENTS.md`), which a `PreToolUse` hook
  (`scripts/hooks/pretooluse.ts`) enforces at the moment of the write — do not
  design around them, and do not treat a hook denial as a puzzle to route
  around:

  1. No internal `<a href>`/`window.location` navigation — always `<Link>`.
  2. No network/db call in `src/middleware.ts` — the JWT check stays local.
     Applies only once the `persistence` module is installed (`src/middleware.ts`
     does not exist in a Landing-preset project).
  3. No feature ships without a test proven able to fail.
  4. Every server action/route validates input with `zod` before use.
  5. Every commit follows Conventional Commits (one exception: `/gridfin`
     onboarding commits — see `docs/rules/git.md`).
  6. UI colors come from the design tokens in `src/app/globals.css` — no
     hardcoded hex/rgb/hsl or arbitrary-value color classes in components
     (Next metadata images are exempt; see `docs/rules/frontend.md`).

- **Read the rule that governs the step you are on, at the moment you reach it** —
  not from memory, and not all of them up front:

  - `docs/rules/architecture.md` — new routes, feature slices, data access, import direction, schema changes.
  - `docs/rules/definition-of-done.md` — every change, without exception — this is the standing bar, and the one rules file that is never out of scope.
  - `docs/rules/docs.md` — any change to `docs/`, `AGENTS.md`/`AGENTS.md`, or a decision worth remembering across sessions. Docs are the interface between agent sessions — stale docs are worse than missing ones.
  - `docs/rules/frontend.md` — any page, component, mutation, or loading state — responsiveness is an invariant here, not a nice-to-have.
  - `docs/rules/git.md` — every commit, branch, and merge in this repo.
  - `docs/rules/modules.md` — any `modules/<name>/` directory and any skill that installs one.
  - `docs/rules/security.md` — every server action, route handler, env var, and auth-adjacent change — this is baseline, not opt-in.
  - `docs/rules/skills.md` — any change under `.Codex/skills/**`, `.Codex/skill-steps/**`, or the compiler that builds them (`scripts/lib/codegen.ts`, `scripts/gen-skills.ts`). The skills are the product — this is the contract they are written against.
  - `docs/rules/sources.md` — any line of code or prose that asserts how a third-party framework, library, or API behaves.
  - `docs/rules/testing.md` — every code change — no feature is done without tests.

- **Run gates in order; stop at the first FAIL.** Later gates would only
  bury the signal. Report the failed gate with its exact error output, name
  the next action, and mark the remaining gates SKIPPED.
- **Don't fix here.** This skill diagnoses and points; fixing belongs to the
  caller (usually the `feature` skill or the user). One exception: the
  Playwright browser install below is environment setup, not a code fix.
- **Quoted evidence stays verbatim** — never translate a command's output.

## Scope

Default scope is the current branch's diff against `main`
(`git diff main...HEAD --name-only`, plus `git status` for uncommitted
work). If the user gives a range or file list, use that instead. The gate
sequence always runs on the whole repo; scope only narrows the smoke step.

## Gate sequence — `pnpm gates` runs it, you read it

**Run `pnpm gates`.** It executes the sequence in order, stops at the first
failure, decides the two conditional gates for itself (no `db:reset` script →
N.A.; a diff that touches no skill, rule or entry map → the skill harness is
N.A.), quotes one line of each command's own output, and writes the run to
`.gridfin/runs/<id>.json`.

That is deliberate: the commands were always mechanical, and the only part left
to judgment — assembling the table — was the part with an incentive to read a
red gate generously. **Do not rebuild the table by hand and do not re-run the
gates individually to "check".** Paste what the runner printed.

- A gate the user asked you to skip is `--waive <gate>="their reason"`, never a
  silent omission. It prints WAIVED and lands in the ledger with the reason.
- After a fix, `pnpm gates --only <gate>` reruns just that one.
- `pnpm gates:show` prints the last run, days later, when someone asks what was
  actually verified.

What the runner cannot know is below: why a gate failed, and what to do about
it. That is still yours.

1. **`pnpm lint`** — oxlint → eslint → prettier --check → tsc. On FAIL, the
   failing sub-tool names the rule; map it to its rules file (e.g. a
   `boundaries/dependencies` error → `docs/rules/architecture.md`, a
   formatting diff → run `pnpm format`).
2. **`pnpm test`** — all three Vitest projects (unit, component,
   integration). On FAIL, quote the first failing test name + assertion.
   2b. **DB reset (App/App+Billing only)** — when the project has the
   `persistence` module installed (`docs/manifest.md` → `## Installed
 modules` lists it, or a `db:reset` script exists in `package.json`), run
   the module's `db:reset` (migrate + reseed) and confirm it reproduces a
   working local database. A Landing project has no database — mark this
   N.A. and move on, same as the other N.A. rows.
3. **`pnpm test:e2e`** — Playwright. Two environment notes:
   - **Browsers:** if it errors with `Executable doesn't exist` /
     "browser is not installed", run `pnpm exec playwright install chromium`
     once, then retry — that retry doesn't count as a fix attempt.
   - **Own server:** the suite always boots its own production build on the
     app port (`reuseExistingServer: false` in `playwright.config.ts`), so a
     running `pnpm dev` is never silently tested in its place. If that port
     is occupied, e2e fails loudly with a port-in-use error — stop the other
     server and retry.
4. **`pnpm build`** — production build must complete cleanly.
5. **Skill harness** — run only when the diff touches `.Codex/skills/**`,
   `docs/rules/**`, or `AGENTS.md` (the skills are the product; nothing else in
   the gate sequence reads them, and the preamble is compiled from those files).
   `pnpm skills:check && pnpm skills:validate && pnpm skills:evals` proves, in
   order: that no generated `SKILL.md` was hand-edited away from its
   `SKILL.md.tmpl`; that each one still parses, carries its required sections
   and no stray Cyrillic; and that every description still routes to its own
   trigger prompts. Nothing under those paths changed → N.A., say so and move
   on. On a `skills:check` FAIL the fix is always the same: move your edit into
   the `.tmpl` and run `pnpm skills:gen`. On an evals FAIL, the fix is usually
   the description, not the eval (see the `review` skill's own routing fix for
   the pattern).

## Browser smoke of changed surfaces

Gates prove the code; this step proves the changed pages actually render.

1. **Identify changed surfaces from the diff:** a changed
   `src/app/<segment>/page.tsx` (or `layout.tsx`/`loading.tsx`) maps
   directly to its route; a changed feature slice maps to every route that
   imports it (grep `src/app/` for imports from that feature's `index`). A
   change under `src/lib/` or `src/components/` maps to the golden-path
   routes (`/`, `/signin`, `/dashboard`) — these are cross-cutting, so smoke
   the surfaces most likely to exercise them. Nothing route-facing changed →
   say so and skip this step.
2. Start `pnpm dev` in the background; wait until it reports ready.
3. For each affected route, load it in a real browser (Playwright or
   chrome-devtools tooling): confirm the page renders its expected content
   (not an error boundary or blank shell) and the **console has no errors**.
   If no browser tooling is available, fall back to `curl`: assert the
   status code and that the HTML contains expected content and no error
   markers — and state explicitly that the console check was not performed.
4. On changed interactive surfaces, do one click-response pass: the primary
   action responds instantly (optimistic UI per `docs/rules/frontend.md`),
   no full-page reload on internal navigation.
5. **Kill the dev server** when done — never leave it running.
6. Record the outcome on the run:
   `pnpm gates:note "browser smoke: <routes>" --status pass --evidence "<what you saw>"`
   — or `--status skipped` with the reason nothing route-facing changed. The
   ledger is the only place this step leaves a trace; the transcript is gone
   next week.

## Report format

Paste the runner's table verbatim, then add the smoke row it could not produce:

| Gate          | Command     | Result         | Evidence         |
| ------------- | ----------- | -------------- | ---------------- |
| Browser smoke | routes list | PASS/FAIL/N.A. | status + console |

On any FAIL, the report's last line names the **next action**: what to fix,
which rules file governs it, and (if called from the `feature` skill) that
the fix-and-rerun loop happens there. All rows PASS → say exactly that: the
branch is green. Green gates are one section of
`docs/rules/definition-of-done.md`, not the whole bar — the runner prints
"Not covered by this run" for exactly this reason; repeat it rather than
ending on the green table, per `docs/rules/git.md`.

## Common rationalizations

| Rationalization                                             | Reality                                                                                                                                             |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| "It should pass — it passed locally an hour ago"            | A gate is PASS only when this run exited 0 and you can quote the line. Memory is not evidence.                                                      |
| "E2E is slow, the unit tests cover it"                      | They cover different things. The gate sequence is ordered, not optional; a skipped gate is reported SKIPPED, never silently dropped.                |
| "The failure is obvious, I'll just fix it while I'm here"   | This skill diagnoses. Fixing here hides the failure from the caller's fix-and-rerun loop and from the commit history.                               |
| "curl returned 200, the console is probably clean"          | Then say so: report that the console check was not performed. A probably-clean console is an unchecked console.                                     |
| "Nothing route-facing changed, so smoke is N.A."            | Correct — and you must say which routes you checked that against. "N.A." without the mapping is a skipped step wearing a hat.                       |
| "I'll run the four commands myself instead of `pnpm gates`" | Then the table is your account of what happened rather than the run's. Same commands, one difference: the runner cannot decide it liked the output. |
| "The user said skip e2e, so I left it out of the report"    | A skip nobody can see is indistinguishable from a gate that failed silently. `--waive e2e="their reason"` — recorded, printed, in the ledger.       |

## Red flags

- A PASS row whose Evidence column paraphrases instead of quoting
- A table typed by hand when `pnpm gates` printed one
- Gates reported out of order, or a later gate run after an earlier FAIL
- A dev server left running after the smoke step
- The word "should" in any row of the report table
- A run whose smoke step left no `gates:note` behind
