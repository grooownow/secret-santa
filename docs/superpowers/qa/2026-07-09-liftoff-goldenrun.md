# Liftoff Golden Run — 2026-07-09

End-to-end execution of `/liftoff` (steps 0→5) in a fresh clone, playing a real
buyer. Test idea: **Trailhead** — SaaS for indie hikers to plan and share
multi-day trail itineraries.

- Clone: scratchpad `goldenrun/app`, branch `feat/plan-3-agent-infra`
- Bootstrap: `./scripts/bootstrap --ci` — PASS (deps installed, .env created,
  PGlite migrated + seeded 1 demo user)

## Per-step outcome table

| Step | Outcome | Notes |
| ---- | ------- | ----- |
| bootstrap | PASS | migrate + seed clean |
| resume protocol (pre-0) | PASS | no `liftoff:` commits found (template-dev commits like `fix: liftoff 4e ...` correctly do NOT match the `liftoff:` prefix) |
| 0 environment | PASS | lint + 59 tests green; no tracked changes → commit correctly skipped per skill |
| 1 idea | PASS | interview branch A, fit check pass, docs/idea.md from template |
| 2 PRD | PASS | approved first pass; summary matched wedge |
| 3 specs | PASS | 3 specs (trip-itinerary-builder, gear-list, share-link), test scenarios + data model concrete, digests confirmed |
| 4a rename | PASS w/ Finding 1 | enumerated grep clean; gates green |
| 4b brand | PASS w/ Finding 2 | forest green → hue 150 per recipe; lint green |
| resume test (post-4b) | PASS | fresh agent → resumes at 4c; see trace below |
| 4c schema | PASS | 4 tables, migration 0002 CREATE-only, gates green |
| 4d factories/seed | PASS w/ Finding 5 | first lint red (noUncheckedIndexedAccess on `.returning()`); fixed with `must()` guard; db:reset seeds linked rows |
| 4e manifest/profile | PASS w/ Finding 6 | done-when grep unsatisfiable without header-prose rewrites |
| 5 first run | PASS w/ Findings 7, 8 | smoke checks green; step-5 commit initially BLOCKED by pre-commit (Finding 8) |

## Findings

### Finding 1 — 4a rename list omits page.tsx CardDescription (template tagline survives)

- **Step:** 4a. **Text that failed:** 4a lists for `src/app/page.tsx` only
  "the hero `CardTitle` (\"Liftkit\")" — but the sibling `CardDescription`
  is the template tagline "Agent-native SaaS starter". The same tagline IS
  renamed in `layout.tsx` (`description`) and `opengraph-image.tsx` (second
  text node), so the omission is an inconsistency: the adapted product's
  homepage keeps the Liftkit tagline. The done-when grep can't catch it (no
  "liftkit" substring).
- **Improvised:** rebranded the CardDescription to the product one-liner.
- **Fix:** SKILL.md 4a now names the hero CardTitle **and** the tagline
  CardDescription for page.tsx.

### Finding 2 — 4b done-when says primary-foreground "changed", but recipe values equal template defaults

- **Step:** 4b. **Text that failed:** done-when: "`--primary`/`--primary-foreground`/`--ring`
  changed in both theme blocks". The neutral template already ships
  `--primary-foreground: oklch(0.985 0 0)` (light) and `oklch(0.205 0 0)`
  (dark) — exactly the values the adaptation recipe prescribes, so
  `--primary-foreground` cannot literally "change"; a strict resume
  verifier would conclude 4b incomplete and redo it.
- **Improvised:** interpreted "changed" as "set per the recipe".
- **Fix:** done-when reworded to "set per the recipe (primary-foreground
  may already equal the recipe value in the neutral template)".

## Resume-test trace (after 4b)

Simulated session death immediately after the `liftoff: step 4b` commit
(abandon note written; no state handed off). A context-free subagent was
given only "user typed /liftoff in this repo" and executed the skill's
resume protocol literally:

1. `git log --oneline -30` → top commit `24e55eb liftoff: step 4b — brand
   primary hue`; parsed as `step 4<letter>` with letter `b` → continue at
   next letter.
2. Completion short-circuit checked: `grep -c liftoff:fill docs/manifest.md`
   → 10 markers, no `liftoff: step 5` commit → not complete.
3. 4b done-when verified: `--primary`/`--ring` changed in both blocks
   (reconstructed baseline via `git show 24e55eb`), `pnpm lint` exit 0 →
   PASS. Noted `--primary-foreground` unchanged (= Finding 2).
4. `git status` → working tree clean, no uncommitted 4c work.
5. **Conclusion: resume at Step 4c — Domain schema.** Correct. Did not
   execute further, per test harness instruction.

Fresh-agent friction reports folded into findings: Finding 2 (foreground
"changed" wording + no defined baseline for "changed"), Finding 3 ("keep
neutral" skip leaves no resume marker → brand question re-asked on resume),
Finding 4 (completion short-circuit is the LAST bullet of the resume
protocol; a sequential reader parses a resume point before learning it may
be moot).

### Finding 3 — "keep neutral" leaves no 4b resume marker

- **Step:** 4b / resume protocol. **Text:** "If 'keep neutral', skip this
  sub-step (no empty commit)." A later resume then sees `step 4a` as the
  latest marker and re-asks the brand question — the letter-increment rule
  cannot represent a skipped sub-step.
- **Fix:** on "keep neutral", record the decision with an explicit empty
  commit: `git commit --allow-empty -m "liftoff: step 4b — brand kept
  neutral"`, so the resume marker stays monotonic.

### Finding 4 — completion short-circuit ordered last in the resume protocol

- **Step:** resume protocol. **Text:** the "onboarding is complete" bullet
  comes after the parse-and-continue rules.
- **Fix:** moved to be the first check in the protocol.

### Finding 5 — seed recipe's `.returning()` pattern trips `noUncheckedIndexedAccess`

- **Step:** 4d. **Text:** adaptation.md seed recipe: "`.returning()` gives
  you inserted ids to link children" — with no warning that tsconfig has
  `noUncheckedIndexedAccess`, so `const [row] = ...returning()` /
  `rows[0].id` fails `tsc` (part of `pnpm lint`): 12 × TS18048/TS2532.
  Every agent following the recipe literally hits this red on the 4d gate.
- **Improvised:** added a `must()` guard helper in `scripts/seed.ts`.
- **Fix:** adaptation.md seed recipe now documents the constraint and the
  `must()` pattern.

### Finding 6 — 4e done-when unsatisfiable as written (marker string lives in header prose)

- **Step:** 4e. **Text:** done-when "`grep -l liftoff:fill docs/manifest.md
  docs/qa/project-profile.md` returns nothing" — but the manifest's intro
  paragraph ("Every unfilled field is marked `<!-- liftoff:fill -->` ...
  `grep liftoff:fill docs/manifest.md`") and the qa profile's header
  blockquote + "(filled by step 4e)" explainer contain the literal string.
  Filling every field still leaves grep matching both files; the done-when
  can never pass without undocumented prose rewrites.
- **Improvised:** rewrote both files' explanatory prose into "filled by
  /liftoff on <date>" notes.
- **Fix:** SKILL.md 4e gained an explicit step 3: prose mentions count;
  rewrite them.

### Finding 7 — roadmap's Shipped marker not covered by Step 5.3

- **Step:** 5. **Text:** step 5.3 names Now/Next/Later only, but
  `docs/roadmap.md` has a fourth `liftoff:fill` marker under `## Shipped`,
  and the done-when demands zero markers. Also: when all PRD features are
  spec'd in Now, Next's content is unspecified.
- **Improvised:** Shipped = "Nothing shipped yet" line; Next = explicit
  "empty" line.
- **Fix:** step 5.3 now names all four sections and both conventions.

### Finding 8 — MAJOR (template bug): commit after `pnpm dev` blocked by pre-commit oxlint

- **Step:** 5 (final commit). **What happened:** Next 16's dev server
  rewrites tracked `next-env.d.ts` (`import "./.next/types/routes.d.ts"` →
  `"./.next/dev/types/routes.d.ts"`). The skill's own step 5 flow (run
  `pnpm dev`, then commit) therefore always stages `next-env.d.ts`. When it
  is the ONLY staged `*.ts` file, lefthook's oxlint job passes just that
  file to `pnpm oxlint`, `.oxlintrc.json` `ignorePatterns` filters it out,
  oxlint prints "No files found to lint. Please check your paths and ignore
  patterns." and **exits 1** → every commit fails. Reproduced 3×; the
  golden-run step-5 commit was hard-blocked.
- **Improvised (and fixed in template):** `next-env.d.ts` added to
  `.gitignore` + `git rm --cached` (verified `tsc --noEmit` stays green
  without the file, exit 0), plus `exclude: [next-env.d.ts]` on the
  lefthook oxlint job as belt-and-suspenders. Re-verified in the clone:
  step-5 commit passes hooks after the fix.

## Final assertion checklist

All checks run in the adapted clone after step 5:

- [x] PRD approved — `docs/prd.md` `## Status` → `approved` (explicit buyer
      approval, first pass).
- [x] 3 specs with test scenarios approved — `trip-itinerary-builder`,
      `gear-list`, `share-link`; each has a filled Test scenarios section;
      all `## Status` → `approved` after digest confirmation.
- [x] Domain tables + NEW migration — `trips`, `trip_days`, `waypoints`,
      `gear_items` in `src/db/schema.ts`; migration
      `0002_organic_rhino.sql` (CREATE-only, reviewed before apply);
      `git diff origin/... -- 0000*.sql 0001*.sql` = 0 lines (untouched).
- [x] Factories + linked seed — 5 `make*()` factories; `pnpm db:reset` →
      "migrations applied successfully!" + "Seeded 1 demo user, 1 trip,
      3 trip days, 5 waypoints, 3 gear items." (rows chained by real FKs;
      verified readable via one-off tsx query: trips=1 "Tour du Mont Blanc —
      West Half", days=3, waypoints=5, gear=3).
- [x] Manifest zero `liftoff:fill` — grep exit 1 (no matches).
- [x] QA profile zero `liftoff:fill` — grep exit 1 (no matches).
- [x] `grep -ri liftkit <4a enumerated list>` — exit 1 (no matches).
- [x] `pnpm lint && pnpm test && pnpm build` — lint exit 0, 13 files /
      59 tests passed, build exit 0.
- [x] Commit log convention — `liftoff: step 1/2/3/4a/4b/4c/4d/4e/5` in
      order (step 0 correctly skipped: no tracked changes), plus one
      Conventional-Commits `fix:` for the Finding 8 template bug.
- [x] Roadmap seeded from PRD — Now = 3 spec'd features (linked), Later =
      PRD Not-in-v1 items, zero `liftoff:fill` markers.
- [x] Smoke checks — `GET /` 200 + "Trailhead" in HTML; `GET /signin` 200
      (renders the documented "No auth providers configured" card — correct
      for a fresh env without OAuth creds); `GET /dashboard` 307 →
      `/signin?callbackUrl=...`; `pnpm db:seed` → "Seed skipped: 1 users
      already present."

## Fix verification (in the clone)

- Finding 8 fix: step-5 commit passes hooks after untracking
  `next-env.d.ts` (exercised live).
- Keep-neutral empty-commit path (Finding 3 fix): probe
  `git commit --allow-empty -m "liftoff: step 4b — brand kept neutral"`
  exits 0 through lefthook (skips jobs with no matching staged files);
  probe dropped afterwards.
- Fixed resume protocol (Finding 4): completion check fires first on the
  completed clone (0 markers + step 5 commit → "onboarding complete").
- Findings 1, 5, 6, 7 fixes describe exactly what the run had to improvise,
  re-traced against the fixed text.

## Verdict

PASS-WITH-FIXES. The flow is executable end-to-end by a buyer's agent; all
gates and artifacts land. 8 findings: 1 major template bug (Finding 8 —
would hard-block every buyer at step 5), 1 major doc-gap (Finding 6 —
unsatisfiable done-when), 6 minor. All fixed in the skill/template on
`feat/plan-3-agent-infra`.
