---
name: deploy
preamble-tier: 2
description: Walks the user through shipping the project to production on Vercel with a managed Postgres database when the project needs one, checkpoint by checkpoint, using docs/playbooks/deploy.md as the source of truth. Use when the project is ready to go live for the first time, or when re-running the deploy flow (new environment, migrated database, custom domain). NOT for a local gate run before merging (that is verify).
---

<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly. Regenerate: pnpm skills:gen -->

# Deploy

This skill owns no deploy knowledge itself — it drives `docs/playbooks/deploy.md`
and stops for confirmation at every checkpoint. If that file and this skill ever
disagree, the playbook wins; update it, don't fork logic in here.

## Ground rules

<!-- Generated from the shared preamble (scripts/lib/codegen.ts). Edit it there, not here. -->

- **Language:** chat with the user in the project's chat language
  (`docs/manifest.md` → _Chat language_; falls back to the language of the
  user's messages while unset). Every artifact that lives in the repo — code,
  docs, commit messages — is English.
- **Evidence, not adjectives.** Never report a command as green without quoting
  the line that proves it. "It should pass" is not a result, and the word
  _should_ in a status line is a red flag about your own honesty.
- **The hard invariants** (`CLAUDE.md`), which a `PreToolUse` hook
  (`scripts/hooks/pretooluse.ts`) enforces at the moment of the write — do not
  design around them, and do not treat a hook denial as a puzzle to route
  around:

  1. No internal `<a href>`/`window.location` navigation — always `<Link>`.
  2. No network/db call in `src/middleware.ts` — the JWT check stays local.
  3. No feature ships without a test proven able to fail.
  4. Every server action/route validates input with `zod` before use.
  5. Every commit follows Conventional Commits (see `docs/rules/git.md`).
  6. UI colors come from the design tokens in `src/app/globals.css` — no
     hardcoded hex/rgb/hsl or arbitrary-value color classes in components
     (Next metadata images are exempt; see `docs/rules/frontend.md`).

- **Read the rule that governs the step you are on, at the moment you reach it** —
  not from memory, and not all of them up front:

  - `docs/rules/architecture.md` — new routes, feature slices, data access, import direction, schema changes.
  - `docs/rules/definition-of-done.md` — every change, without exception — this is the standing bar, and the one rules file that is never out of scope.
  - `docs/rules/docs.md` — any change to `docs/`, `CLAUDE.md`, or a decision worth remembering across sessions. Docs are the interface between agent sessions — stale docs are worse than missing ones.
  - `docs/rules/frontend.md` — any page, component, mutation, or loading state — responsiveness is an invariant here, not a nice-to-have.
  - `docs/rules/git.md` — every commit, branch, and merge in this repo.
  - `docs/rules/security.md` — every server action, route handler, env var, and auth-adjacent change — this is baseline, not opt-in.
  - `docs/rules/skills.md` — any change under `.claude/skills/**`, `.claude/skill-steps/**`, or the compiler that builds them (`scripts/lib/codegen.ts`, `scripts/gen-skills.ts`). The skills are the product — this is the contract they are written against.
  - `docs/rules/sources.md` — any line of code or prose that asserts how a third-party framework, library, or API behaves.
  - `docs/rules/testing.md` — every code change — no feature is done without tests.

- **Never deploy red.** Before starting, run the `verify` skill's gate
  sequence (`pnpm lint && pnpm test && pnpm test:e2e && pnpm build`, plus its
  browser smoke check). Any FAIL stops here — report it and hand back to
  `verify`'s own next-action guidance; do not proceed to the playbook.
- **One step at a time.** Read `docs/playbooks/deploy.md` step by step, not
  all at once into a plan — the user is doing real clicking in another tab
  and needs the current step in front of them.
- **Confirm "done when" before moving on.** Every playbook step has an
  implicit or explicit completion signal (a value copied, a page live, a
  command's exit code). Ask or check for it before advancing — don't assume
  the user finished a dashboard action just because they said "ok".
- **Agent-does vs user-does.** The playbook marks who acts at each step.
  Dashboard clicks and secret values are the user's; commands you can run
  yourself (migrations, `vercel` CLI, smoke checks), you run and show output.
- **Every playbook checkpoint is a human checkpoint.** Name the step you are
  on in each message, so a dropped session resumes by asking which checkpoint
  was last confirmed — never by re-running dashboard actions blind.
- **Every fix-and-retry loop is bounded: two honest attempts at the same
  failure, then stop.** Report the exact command output, the state you are in,
  and what you would try next; let the user decide. A third attempt on the same
  red gate is not persistence — it is where you start changing code you have
  stopped understanding, and where a real failure gets buried under repair
  attempts.
- **A loop that waits on a person is not bounded by that budget** — it ends
  when they answer. It owes something else instead: say, before you ask, where
  the flow resumes if the session drops before the answer arrives.

## Flow

1. **Gate check.** Run (or ask the user to confirm a recent) `verify` pass.
   Red → stop and report. Green → proceed.
2. **Load the playbook.** Read `docs/playbooks/deploy.md` fresh each run —
   it may have changed since you last saw it; never recite it from memory.
3. **Walk it checkpoint by checkpoint**, in the order the playbook lists:
   GitHub push → managed Postgres → Vercel import → environment variables → migrations
   against prod → smoke check → optional custom domain.
   For each:
   - State what happens at this step and who does it (agent command vs.
     user dashboard action).
   - If it's a user action, give the exact navigation the playbook
     specifies and say precisely what value to copy back (e.g. a connection
     string) — never invent a UI path not in the playbook.
   - If it's an agent action, run the real command and show its output.
   - Confirm the step's "done when" signal before moving to the next step.
4. **Final done-when.** Only declare the deploy complete once all three of
   the playbook's top-level done-when criteria hold: the live URL serves
   `/`, sign-in works end-to-end, and a Lighthouse spot-check passes. Quote
   evidence for each (a status code, a successful sign-in, a score), the
   same way `verify` does — no success claim without output.

## STOP conditions

- Gate sequence red → stop before touching the playbook.
- A playbook step's done-when signal can't be confirmed (e.g. user reports
  an error copying the connection string) → stop, diagnose with the user,
  don't skip ahead assuming it will resolve itself.
- Playbook references a path/command that no longer exists in this repo →
  stop, flag the drift, fix the playbook before continuing (per
  `docs/rules/docs.md`'s actualization rule).

## Common rationalizations

| Rationalization                                              | Reality                                                                                                                                        |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| "I'll run the checkpoints back to back, they're all routine" | Each checkpoint is confirmed by the user before the next begins. A production deploy is the one flow where an unattended mistake is expensive. |
| "The env var is easier to paste into the repo for now"       | A secret in the repo is a secret published. `docs/rules/security.md` has no "for now".                                                         |
| "Migrations ran locally, they'll run in production"          | Different database, different data, different failure. Run them against production explicitly and read the output.                             |
| "The playbook is slightly out of date, I'll improvise"       | Then fix the playbook first — it is the source of truth, and the next deploy reads it too.                                                     |

## Red flags

- A checkpoint marked done without the user saying so
- A secret literal anywhere in a diff
- The production database migrated without its output being read
