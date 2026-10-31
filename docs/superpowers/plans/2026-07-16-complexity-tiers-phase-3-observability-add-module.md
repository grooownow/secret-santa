# Complexity Tiers — Phase 3: observability module + add-module skill + App+Billing intent — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Finish the deferred v1-adjacent items: extract Sentry into an `observability` module (App-preset), add an `add-module` skill so a started project can install a module later, and make the App+Billing preset mean "App + a billing roadmap intent" (no billing code — the template builds billing per-project via `/feature` + `docs/playbooks/billing.md`).

**Architecture:** Reuses the Phase-1 module mechanism (`pnpm module:apply`, `modules/<name>/` with files/fragments/module.md). `observability` = `presets: [App, App+Billing]` (auto-applied for App), so Landing loses Sentry (lighter) and App keeps it — no module-format change needed (presets stays non-empty). Sentry env vars (`SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`) stay in BOTH env.ts versions (they are optional and harmless), so the observability code reads them under any preset and the module touches no shared file (avoiding the multi-module env.ts-ownership problem). The `add-module` skill is a new Tier-2 skill that drives a module's own `module.md` apply-plan for an already-started project. Billing stays knowledge-not-code per the template's stated philosophy (`docs/playbooks/billing.md`).

**Tech Stack:** the Phase-1 applier, compiled skills (`SKILL.md.tmpl` → `pnpm skills:gen`), Vitest, GitHub Actions, `@sentry/nextjs`.

## Global Constraints
- Skills are COMPILED — edit `.tmpl`, `pnpm skills:gen`; never hand-edit generated `SKILL.md`.
- New skill must be registered in BOTH `scripts/lib/skill-coverage.ts` (coverage floor) and `scripts/fixtures/skill-size-baseline.json` (size budget) or CI fails; and needs an `evals.json` with ≥3 `trigger.positive`, ≥2 `trigger.negative`, ≥1 `evals` entry (`scripts/skill-evals.ts` MIN_* constants).
- `modules/**` is outside the core tsc/eslint/oxlint/prettier/vitest/lefthook surface (Phase 1). A modules-only commit skips lefthook oxlint.
- `referencedPnpmScripts` drift check: never write `` `pnpm db:*` `` in a skill body (Landing lacks those scripts) — reference module-provided scripts without the `pnpm ` prefix, or rely on `gen-skills.test.ts`'s `moduleProvidedScripts()` allowlist.
- Conventional Commits (PreToolUse hook + lefthook); commit via `git commit -F <file>`; `pnpm format` before each commit; end bodies with `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`. English only. Branch `feat/complexity-tiers-phase-3`.
- Gates after skill/CLAUDE edits: `pnpm skills:gen && pnpm skills:check && pnpm skills:validate && pnpm skills:evals && pnpm test` (size budget); bump `skill-size-baseline.json` by hand only if a skill exceeds 1.5×.

## Confirmed facts
- Sentry is NOT wrapped in `withSentryConfig` — `next.config.ts` only has an explanatory comment (no `@sentry` import). Extraction needs no next.config logic change.
- Sentry files in core: `src/instrumentation.ts`, `src/instrumentation-client.ts`, `src/instrumentation.test.ts`, `src/sentry.server.config.ts`, `src/sentry.edge.config.ts`. `instrumentation.ts` is purely Sentry (register() imports the sentry configs; onRequestError → Sentry) and nothing imports it (Next auto-loads) — a clean leaf.
- `@sentry/nextjs` is used only by those 5 files (+ the next.config comment).

---

### Task 1: Extract Sentry into the `observability` module

**Files:**
- Create: `modules/observability/module.md`, `modules/observability/files/src/{instrumentation.ts,instrumentation-client.ts,instrumentation.test.ts,sentry.server.config.ts,sentry.edge.config.ts}`, `modules/observability/fragments/package-deps.md`.
- Remove from core (git rm): the 5 Sentry files above.
- Modify: `package.json` (remove `@sentry/nextjs`; regen lockfile), `next.config.ts` (optional: trim the now-orphaned Sentry comment to one line), `src/core-boundary.test.ts` (guard: core has no `@sentry` import).
- Modify: `.github/workflows/ci.yml` + `scripts/materialize-app.ts`/its test (apply observability alongside persistence so App = core+persistence+observability is compiled/tested).

**Interfaces:** `observability` module — `depends-on: []`, `presets: [App, App+Billing]`.

- [ ] **Step 1:** Copy the 5 Sentry files verbatim into `modules/observability/files/src/` (preserve paths). Write `fragments/package-deps.md` adding `@sentry/nextjs@^10.64.0` to dependencies (pull exact version from package.json). Write `module.md` (frontmatter name=observability, description, depends-on: [], presets: [App, App+Billing]; a `## Apply plan` that runs `pnpm module:apply observability` + `pnpm install`, notes Sentry env vars are already present in env.ts, ends in a Conventional commit). `pnpm modules:validate` → 2 modules, 0 invalid.
- [ ] **Step 2:** Extend `src/core-boundary.test.ts` (RED first): assert `grep -rnE "from \"@sentry|@sentry/nextjs" src` returns nothing AND `src/instrumentation.ts`/`src/sentry.server.config.ts` are absent from core. Run → FAIL.
- [ ] **Step 3:** `git rm` the 5 Sentry files from core. Remove `@sentry/nextjs` from `package.json` deps; `pnpm install` to regen `pnpm-lock.yaml`. Optionally trim next.config.ts's Sentry comment. Confirm nothing in core imports `@sentry` (grep).
- [ ] **Step 4:** `pnpm format && pnpm lint && pnpm test && pnpm build` — core (Landing) green without Sentry; the extended core-boundary guard GREEN.
- [ ] **Step 5:** CI + round-trip: in `scripts/materialize-app.ts` apply `observability` after `persistence` (so the materialized App has both); update its test to assert an observability file (e.g. `src/sentry.server.config.ts`) landed. In `.github/workflows/ci.yml` `materialized-app` job, add `pnpm module:apply observability` after the persistence apply (before the second `pnpm install`), so App's Sentry code is compiled + `instrumentation.test.ts` runs. `remote-db`/`lighthouse` need only persistence (leave). Verify the materialize test.
- [ ] **Step 6:** Out-of-tree proof (not committed): materialize App (persistence+observability) into a temp dir, `pnpm install`, `pnpm exec tsc --noEmit` = 0, and `pnpm test` runs `instrumentation.test.ts` green. Report.
- [ ] **Step 7: Commit** (two commits ok: module authored, then core reduction) — `feat(modules): extract Sentry into the observability module (App preset)`.

---

### Task 2: `add-module` skill

**Files:**
- Create: `.claude/skills/add-module/SKILL.md.tmpl`, `.claude/skills/add-module/evals.json`
- Generate: `.claude/skills/add-module/SKILL.md`
- Modify: `scripts/lib/skill-coverage.ts` (register add-module), `scripts/fixtures/skill-size-baseline.json` (add its entry), `CLAUDE.md`/`AGENTS.md` "Key commands"/skills references if they enumerate skills.

**Interfaces:** a Tier-2 skill (`preamble-tier: 2`). Consumes `pnpm module:apply <name>`, the manifest `## Installed modules`/`## Preset`, and each `modules/<name>/module.md` apply-plan.

- [ ] **Step 1:** Write `SKILL.md.tmpl`. Description (≤1024 chars, with a trigger clause) routes prompts like "add auth/a database to my landing", "install the persistence module", "add error tracking". Body flow:
  1. List installed vs available modules (`modules/*/module.md`, and manifest `## Installed modules`); if the target is already installed, stop.
  2. Resolve `depends-on` — install missing dependency modules first, in order.
  3. Follow the target module's `module.md` apply-plan: `pnpm module:apply <name>` → `pnpm install` → the module's judgment "wiring" steps, RECONCILING any project-diverged module-owned file (env.ts/page.tsx/playwright.config.ts for persistence) instead of blindly overwriting — read the module-owned file's current project version, re-apply the module's intent, keep the project's additions.
  4. Run the module's `## Verify` gates + `pnpm lint && pnpm test`.
  5. Update the manifest: append to `## Installed modules`; if `persistence` was added, set `## Preset` `Landing → App`.
  6. Commit (Conventional).
  Include a `## Common rationalizations` section (skills:validate requires it) and keep the body ≤500 lines. Do NOT put `` `pnpm db:*` `` tokens in the body.
- [ ] **Step 2:** Write `evals.json`: ≥3 `trigger.positive` (e.g. "add a database and login to my landing page project", "install the persistence module", "I need error tracking / observability"), ≥2 `trigger.negative` (prompts that should route elsewhere — e.g. "build the next roadmap feature" → feature; "deploy to production" → deploy), and ≥1 `evals` entry (`trust_level: "provisional"`) describing the expected behavior for "add persistence to a Landing project".
- [ ] **Step 3:** Register in `scripts/lib/skill-coverage.ts` (whatever the registry array/set is) and add an `add-module` entry to `scripts/fixtures/skill-size-baseline.json` with the real `wc -c` of the generated SKILL.md.
- [ ] **Step 4:** `pnpm skills:gen && pnpm skills:check && pnpm skills:validate && pnpm skills:evals` — the new skill validates, routes for its positives, and does NOT collide (<0.75 cosine) with persistence-adjacent skills (`feature`/`liftoff`/`deploy`). `pnpm test` (coverage floor + size budget). If skills:evals flags a collision, sharpen the description. `pnpm format && pnpm lint`.
- [ ] **Step 5: Commit** — `feat(skills): add-module skill to install a module into a started project`.

---

### Task 3: App+Billing preset = App + billing intent

**Files:**
- Modify: `.claude/skills/liftoff/SKILL.md.tmpl` (Step 1 preset wording; Step 4c/Step 5 App+Billing branch)
- Generate: `.claude/skills/liftoff/SKILL.md`

- [ ] **Step 1:** Step 1 preset question wording: change App+Billing from "not yet available — treat as App" to "App + billing planned — installs the App modules now and seeds a billing item in the roadmap; billing code is built later via `/feature billing-checkout` (see `docs/playbooks/billing.md`), not shipped as a module."
- [ ] **Step 2:** Step 4c: for App+Billing, apply the same modules as App (persistence [+ observability via the App preset]) — billing is NOT a module, so nothing extra to apply here. `## Installed modules` = `persistence` (billing is not listed — it's not installed as a module).
- [ ] **Step 3:** Step 5 (roadmap seeding): for App+Billing, add a roadmap item under **Next** or **Later** — "Billing / payments — build via `/feature billing-checkout`, domain input `docs/playbooks/billing.md`". For App and Landing, no billing item.
- [ ] **Step 4:** `pnpm skills:gen && pnpm skills:check && pnpm skills:validate && pnpm skills:evals && pnpm test`; size-check liftoff (bump baseline if >1.5×). `pnpm format && pnpm lint`.
- [ ] **Step 5: Commit** — `feat(liftoff): App+Billing seeds a billing roadmap intent, not a module`.

---

### Task 4: Docs actualize + full verification

**Files:** `CHANGELOG.md`, `docs/decisions/0002-complexity-tiers-mini-core-and-modules.md`, `docs/superpowers/specs/2026-07-15-complexity-tiers-design.md`.

- [ ] **Step 1:** CHANGELOG `[Unreleased]`: note Phase 3 — observability module (Landing drops Sentry; App keeps it), `add-module` skill, App+Billing = billing roadmap intent.
- [ ] **Step 2:** ADR 0002: "Phase 3 implemented (2026-07-16)" — observability module, add-module skill; billing kept knowledge-not-code per `docs/playbooks/billing.md`. Design-doc §10: mark `add-module` resolved (built), the Sentry/e2e split resolved (Sentry extracted; e2e stays with its module), billing decision recorded.
- [ ] **Step 3 — full verification:** on Landing: `pnpm lint && pnpm test && pnpm test:e2e && pnpm build && pnpm skills:check && pnpm skills:validate && pnpm skills:evals && pnpm modules:validate` all PASS. Out-of-tree App (persistence+observability): `pnpm install && pnpm exec tsc --noEmit` = 0 and `pnpm test` green (incl instrumentation.test.ts). Report every result with evidence.
- [ ] **Step 4: Commit** — `docs(modules): actualize changelog/ADR/spec for phase 3`.

## Self-Review
- Coverage: observability extraction (Task 1) delivers the "fine Sentry/e2e split" deferred item (Sentry side; the auth e2e already lives with persistence from Phase A); `add-module` (Task 2) delivers the deferred add-module skill; App+Billing (Task 3) resolves the preset per the user's billing decision. Docs (Task 4).
- No placeholders: observability is `presets: [App, App+Billing]` (no format change); Sentry env vars stay in core; the add-module skill's registration touchpoints (skill-coverage, size-baseline, evals MIN_*) are named.
- Consistency: `## Installed modules` never lists billing (not a module); observability is auto-applied for App via its preset field, and add-module can install it (or persistence) into a started project.
