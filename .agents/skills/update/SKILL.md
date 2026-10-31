---
name: update
preamble-tier: 2
description: Pulls newer Gridfin template releases into a project you already started — reads the installed template version from the .gridfin-version stamp, clones the latest template into a temp dir, and applies each newer changelog release's apply plan in ascending order, adapting upstream changes around code you have already written and committing per version. Your project is a copy of the template, not a fork, so it never git-merges or rebases against the template. Use when you want to update or upgrade to a newer template version, after a session notice says a new Gridfin release is available, or when you ask how to adopt the latest changelog changes. NOT for upgrading your own product's dependencies and NOT for installing a capability module (that is add-module).
---

<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly. Regenerate: pnpm skills:gen -->

# Update

A buyer's project is a **copy** of the template with its own git history — not a
fork, not a submodule, not a checkout of an upstream branch. That single fact
decides everything this skill does and refuses to do. There is no shared commit
graph to merge, so `git merge`/`rebase`/`pull` against the template is not a
harder path to the same place — it is the wrong tool that would rewrite the
buyer's history with a stranger's. Updates are applied, not merged: for each
release newer than what is installed, you read that release's **apply plan** and
run it, adapting each step around what the buyer has already built.

The installed template version is the `.gridfin-version` stamp — **not**
`package.json`'s `version`, which is the buyer's own product version and is none
of this skill's business. The buyer's local
`CHANGELOG.md` only documents up to their version — the apply plans for newer
releases live in the newer template, which is why Step 2 fetches a fresh copy
instead of trusting memory or the local changelog.

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

- **A copy, never a fork.** Do not `git merge`, `git rebase`, `git pull`, or add
  a remote against the template. There is no shared ancestor; the only correct
  transport is copying specific files out of a fresh clone.
- **Copy real files from the fresh clone — never reconstruct from memory.** Every
  file an apply plan adds or updates is read out of the clone in Step 2. A file
  you typed from what you remember the template used to contain is a fabrication,
  even when it looks right.
- **Adapt, do not overwrite.** The buyer has built on top of the skeleton. A step
  that says "copy `X`" means reconcile `X` with the buyer's version, not clobber
  it. When you cannot reconcile cleanly, stop and ask (see Step 3).
- **The confidence discipline from the `review` skill applies to every step.**
  Do not report a step as applied without evidence you can quote — a diff, a
  passing gate, the file now on disk. "Should be applied" is not applied.
- **Every fix-and-retry loop is bounded: two honest attempts at the same
  failure, then stop.** Report the exact command output, the state you are in,
  and what you would try next; let the user decide. A third attempt on the same
  red gate is not persistence — it is where you start changing code you have
  stopped understanding, and where a real failure gets buried under repair
  attempts.
- **A loop that waits on a person is not bounded by that budget** — it ends
  when they answer. It owes something else instead: say, before you ask, where
  the flow resumes if the session drops before the answer arrives.
- **Format before every commit.** Run `pnpm format` first — lefthook's
  pre-commit `prettier --check` rejects an unformatted file, and a commit
  rejected in the middle of a flow is how a step ends up half-applied.
- **A commit is a resume point, so only green steps get one.** Never commit
  over a red gate: a session that drops after a green commit resumes from a
  known state, and one that committed a red step leaves the next session
  trusting work that does not pass.

## What this skill does and does not do — say so up front

- **It does not invent changes.** If the clone in Step 2 fails, or the fetched
  changelog has no release newer than installed, there is nothing to apply. Say
  so and stop. Do not synthesize an "update" from your own idea of what a newer
  Gridfin would contain.
- **It does not upgrade dependencies on its own.** Version bumps and dependency
  changes come only from an apply plan, applied as that plan describes.
- **It is not `verify`.** It runs the project's own gates as a per-version
  checkpoint, but the full pre-merge sweep is the `verify` skill's job once the
  update branch is done.

## Step 1 — Preconditions

1. **Read the installed version** from `.gridfin-version` (a project updated from
   0.2.0 may not have the stamp yet — then, and only then, fall back to
   `package.json`'s `version`, and write the stamp as part of this update). This
   is the floor: every release strictly newer than it is in scope, ascending.
2. **The working tree must be clean.** Run `git status`. If there are uncommitted
   or staged changes, stop and ask the user to commit or stash first — an update
   that mixes into unrelated work-in-progress cannot be rolled back cleanly.
3. **Work on a branch, not `main`.** If on `main`, create a branch (e.g.
   `chore/update-<target-version>`) before touching anything. The per-version
   commits in Step 3 are the buyer's rollback points.

State the plan back before acting: "You are on <version>; I will branch, fetch
the latest template, and apply <N> release(s): <list>." Get a nod before Step 2.

## Step 2 — Fetch the newest template into a throwaway temp dir

The buyer is already authenticated to the template repo (they cloned it once to
start the project), so a shallow clone needs no new credentials:

```
git clone --depth 1 https://github.com/grooownow/gridfin-template.git \
  "$(mktemp -d)/gridfin-template"
```

- **If the clone fails, say so and stop.** No network, no access, repo moved —
  all resolve to "I could not fetch the template, so I have nothing to apply."
  Do not guess at the changes. Report the actual error.
- **Read the FRESH `CHANGELOG.md`** from the clone — not the buyer's local one.
  Find every `## [x.y.z]` section with a version strictly greater than installed,
  and order them **ascending** (oldest-newest). That ordered list is the plan.

Keep the clone path; Steps 3-4 copy files out of it and read its per-release
apply plans from the fresh changelog.

## Step 3 — Apply each newer release, in ascending order

For **each** newer version, lowest first, one at a time:

1. **Show the user that release's notes** — the `## [x.y.z]` section from the
   fresh changelog: what changed and why. Let them see what they are adopting.
2. **Run its `### Apply plan`.** The plan is a prompt written for exactly this
   moment. Execute its steps in order, but _adapt_ each one:
   - Copy the files it names **from the fresh clone** (Step 2), never from memory.
   - Where the buyer already customised a file the plan touches (a skill they
     rewrote, a config they extended, a component they replaced), reconcile:
     merge the template's change into the buyer's version rather than replacing
     it. A `.Codex/settings.json` the buyer already has gets the new hook entry
     merged in, not overwritten — the plan itself usually says so.
   - **Pause and ask before anything you cannot cleanly reconcile** — a
     conflicting edit, a destructive change (a deleted file the buyer still
     imports, a renamed column), or a customisation the plan would flatten.
     Present the specific conflict and the options; do not decide silently.
3. **Write this release into `.gridfin-version`**, so the stamp tracks what has
   actually been applied. Leave `package.json`'s `version` alone — that is the
   buyer's product version, and moving it would be vandalism.
4. **Commit this version's changes** with a conventional-commit subject (e.g.
   `chore(update): apply Gridfin 0.3.0`). One commit per version is what lets the
   buyer stop after any release or roll a single one back.

Do not batch two versions into one commit, and do not skip ahead — a later
release's apply plan assumes the earlier one already landed.

## Step 4 — Gate after every version

After each version's plan is applied and before moving to the next, run the
project's own gates and quote the output:

```
pnpm lint && pnpm test
```

Only proceed to the next version when both are green. After the **last** version,
also run `pnpm build`. If a gate fails, treat it as part of that version's work:
fix it (or surface it as a conflict per Step 3) before committing the version and
moving on. A red gate carried into the next release's plan compounds.

When the whole sequence is done, hand off to the `verify` skill for the full
pre-merge sweep, and let the buyer open the PR or merge — this skill updates, it
does not ship.

## Step 5 — Honesty when a step will not apply cleanly

The failure this skill exists to prevent is a silent one: an apply plan step that
targeted a file the buyer has since rewritten, papered over as "done" because the
words of the step were followed even though its intent was not.

- **Surface it as a decision, with the specific conflict.** "Plan step 2 copies
  `src/lib/auth.ts`, but you rewrote that file to add OAuth. Here is the
  template's change; here is yours. Options: …" — then let the user choose.
- **Never claim a step succeeded without evidence.** Reuse the `review` skill's
  confidence gate: if you cannot point at the diff, the file on disk, or a green
  gate that proves the step landed, it did not land — say so.

## Degenerate cases — handle each explicitly

- **Already up to date.** Installed version >= the newest in the fresh changelog:
  say "You are on the latest (<version>) — nothing to apply" and do nothing.
- **Clone has no newer release.** Same outcome as up-to-date: report it, stop.
- **A newer version with no `### Apply plan`.** Rare, and a gap in that release.
  Do not skip it silently: apply the diff of that version's files **from the
  clone** by hand (copy/reconcile the changed files the release notes describe),
  tell the user the plan was missing so the update was reconstructed from the
  file diff, then gate and commit as usual.

## Common rationalizations

| Rationalization                                               | Reality                                                                                                                                                             |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "I'll just `git pull` the template to get the changes"        | The project is a copy, not a fork — there is no shared ancestor. A merge/rebase/pull rewrites the buyer's history with a stranger's. Apply plans, one by one.       |
| "I know what 0.3.0 added, I'll recreate the files"            | You know what you remember, which drifts. Every file comes from the fresh clone in Step 2, or it is a fabrication that happens to look plausible.                   |
| "The plan says copy `X`, so I'll overwrite the buyer's `X`"   | Copy means reconcile. The buyer built on this file; flattening their work is the one unrecoverable move. Merge the change in, or ask.                               |
| "I'll apply all three versions then commit once at the end"   | One commit per version is the rollback contract. A single blob commit means the buyer cannot stop after 0.2 or revert only 0.3.                                     |
| "Gates are slow; I'll run them once at the very end"          | A red gate carried into the next release's plan compounds and buries which version broke it. Gate after every version; that is the point of committing per one.     |
| "The step probably applied — moving on"                       | "Probably" is the silent-failure this skill exists to prevent. Quote the diff or the green gate, or report it unapplied. `review`'s confidence gate applies.        |
| "This version has no apply plan, so I'll skip it"             | Skipping leaves a hole in the buyer's version line. Apply the file diff from the clone by hand and tell them the plan was missing — do not pretend it wasn't there. |
| "The clone failed, but I can update from the local CHANGELOG" | The local changelog stops at the installed version — the newer apply plans are not in it. No clone, no update. Report the failure and stop.                         |

## Red flags

- `git merge`, `git rebase`, `git pull`, or a template remote added to the
  buyer's repo — any of them means you forgot this is a copy, not a fork
- A file written from memory instead of copied out of the Step 2 clone
- Overwriting a file the buyer customised without showing them the conflict first
- More than one version's changes in a single commit, or versions applied
  out of order
- `.gridfin-version` left behind what has actually been applied — or, worse,
  `package.json`'s `version` edited, which is the buyer's product version, not ours
- A gate run skipped between versions, or `pnpm build` never run at the end
- Reporting a step as applied with no diff, file, or gate output to prove it
- Inventing changes when the clone failed or when there is nothing newer to apply
</content>
