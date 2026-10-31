# Liftkit Plan 3: Agent Infrastructure — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The product's core value: the buyer opens Claude Code, types `/liftoff`, and is guided from idea to a running adapted app — plus the daily toolbox (feature/review/verify/deploy), the rules system agents obey, playbooks, and the qa-pilot bridge. Validated by a real end-to-end /liftoff run.

**Architecture:** Everything ships inside the template repo — no marketplace dependency. Skills live in `.claude/skills/<name>/SKILL.md` (repo-scoped; auto-discovered by Claude Code). Rules live in `docs/rules/*.md` (one topic per file, short — context economy); CLAUDE.md/AGENTS.md are thin maps pointing at them. Playbooks are prompt-plans in `docs/playbooks/`. All buyer-facing content is **English**.

**Sources to distill (read-only references, never copied verbatim):** spec §5.2/5.5/5.6/5.7/5.8/5.9 and §6; Katya's prior art in `/Users/ekaterinapustovaa/.claude/skills/kro-glo-*` (feature cycle, review loop) and `/Users/ekaterinapustovaa/Documents/Pet-projects/qa-pilot` (testing rules, profile format, "prove the test can fail"), fortnoise `docs/rules/*` (rule-file style). Distill patterns; write fresh English content fit for a buyer's project.

## Global Constraints

- English for all shipped content; conventional commits; pnpm only.
- `pnpm lint && pnpm test` green at every commit (markdown content doesn't break gates, but prettier formats .md — run `pnpm format` before committing content).
- Rule files: ≤ 120 lines each, one topic, imperative voice, every hard rule names its ENFORCEMENT (lint rule / CI job / test) or is marked `convention` (agent-checked at review).
- Skill files: valid Claude Code skill format — dir `.claude/skills/<name>/`, `SKILL.md` with YAML frontmatter (`name`, `description` — description states WHEN to use, third person). Steps numbered, each step ends with an observable artifact (file/commit/command output). No skill invents facts about the repo — they read rules/manifest at runtime.
- Playbooks: `docs/playbooks/<name>.md`, ≤ 2 pages, frontmatter (`title`, `status: lite`, `owner: user's agent`), steps with explicit "agent does / user does" split, prerequisites section, "done when" section. Business playbooks carry a non-advice disclaimer where relevant (compliance).
- Nothing in docs/ contradicts the code: every command mentioned must exist in package.json; every path must exist.

---

### Task 1: Plan-2 debt sweep

**Files:** delete 3× `.gitkeep` (components/ui, features, lib); `src/instrumentation.ts` (public `Instrumentation.onRequestError` type from "next"); `src/lib/env.ts` (`SENTRY_DSN: z.url().optional()` + test touch); `src/features/profile/update-name-action.ts` (footnote comment: zero-row update semantics); `src/lib/auth.config.test.ts` (case: `pages.signIn === "/signin"`); `playwright.config.ts` (webServer env dummy `AUTH_SECRET`); `package.json` (move `shadcn` to devDependencies); `src/app/global-error.tsx` (inline `prefers-color-scheme` dark palette — keep self-contained).

- [ ] Apply all eight, each verifiable: gates `pnpm lint && pnpm test && pnpm test:e2e` green (e2e run mandatory — playwright env changed).
- [ ] Note in commit body: middleware→proxy rename consciously deferred (coordinate with Auth.js pattern later).
- [ ] Commit: `chore: plan-2 review debt sweep`

### Task 2: docs/rules — the six rule files

**Files:** `docs/rules/architecture.md`, `frontend.md`, `testing.md`, `security.md`, `git.md`, `docs.md`

Content contracts (each distills the named spec section against the REAL shipped code):
- **architecture.md** (§5.7): FSD-lite map (real tree), import-direction table with the actual `boundaries/dependencies` enforcement named, slice anatomy (index.ts public API, actions/queries/ui/tests), db-access rule, thin-routes rule, migrations conventions (never edit applied; generate→review→migrate), evolutionary notes (monorepo later).
- **frontend.md** (§5.6): the five responsiveness invariants with their gates (no-html-link lint + e2e marker test; JWT-local middleware + comment guard; optimistic mutations → exemplar path named; skeletons via loading.tsx; RSC-default/bundle discipline + Lighthouse budgets); token rule (no raw palette classes; global-error exception documented); a11y basics (jsx-a11y plugin, focus, contrast via tokens).
- **testing.md** (§5.4, distill qa-pilot quality-rules/flakiness-catalog PATTERNS not text): the three vitest projects + e2e — what belongs where (decision table); "prove the test can fail" rule; anti-flaky rules (no arbitrary sleeps, deferred-promise pattern for async UI, fake timers for time); false-green bans (no assertion-free tests, no over-mocked integration); factories/seed shared; when to add e2e vs component.
- **security.md** (§5.8): zod at every boundary (exemplar named); typed env (add var = schema + .env.example + test); secrets hygiene (never in code/commits; .env* ignored); headers baseline + CSP deferral rationale; rate-limit helper usage + prod note; audit gate + override escape hatch (tmp precedent); auth rules (JWT local checks, requireUser in data layer, safeCallbackUrl for redirects).
- **git.md** (§5.9): conventional commits; commit after every green step; main always working; feature branches + merge after green verify; lefthook pre-commit; what NOT to commit.
- **docs.md** (§5.9): docs map (what lives where); short-files principle; ADR-lite: when a decision deserves `docs/decisions/` entry + template pointer; actualization rule (feature skill's final step); English-only repo content.

- [ ] Write all six per contracts (≤120 lines each, enforcement named per hard rule).
- [ ] Cross-check every named command/path/rule-ID against the repo (script-grep in report).
- [ ] `pnpm format`; commit: `docs: rules system — architecture, frontend, testing, security, git, docs`

### Task 3: docs system — manifest, roadmap, decisions, templates

**Files:** `docs/manifest.md` (template with placeholders /liftoff fills: product name, one-liner, domain entities, target user, current phase, key URLs), `docs/roadmap.md` (skeleton: Now/Next/Later with seed guidance), `docs/decisions/0001-liftkit-baseline.md` (real first ADR: the stack/architecture decisions inherited from the box — teaches the format by example), `docs/templates/spec.md`, `docs/templates/prd.md`, `docs/templates/idea.md`, `docs/templates/decision.md`

- [ ] Templates: each a skeleton with section headers + one-line guidance per section (spec: problem/scope/UX flow/data model/edge cases/test scenarios/out-of-scope; prd: problem/user/jobs/3-5 features/not-in-v1/success metric; idea: pitch/user/pain/alternative/wedge/risks + scoring rubric 1-5 on pain/reach/feasibility/moat; decision: context/options/decision/consequences).
- [ ] Commit: `docs: manifest, roadmap, first ADR, and authoring templates`

### Task 4: CLAUDE.md + AGENTS.md — the thin entry maps

**Files:** `CLAUDE.md`, `AGENTS.md`

- [ ] CLAUDE.md (≤ 40 lines): greeting logic — if `docs/manifest.md` still has placeholders → "type `/liftoff`"; else → daily-work map (feature/review/verify skills, playbooks list, rules index). Hard invariants inline (the 5 one-liners agents must never violate: no internal `<a>`, no network auth in middleware, tests mandatory in feature cycle, zod at boundaries, conventional commits) — everything else via links to docs/rules/.
- [ ] AGENTS.md: same content, Codex-compatible phrasing (no Claude-specific tool names), one file NOT a symlink (some tools don't follow symlinks) — a sync note comment at top of both ("edit both together").
- [ ] Commit: `docs: CLAUDE.md and AGENTS.md entry maps`

### Task 5: Skill — /liftoff (the onboarding flagship)

**Files:** `.claude/skills/liftoff/SKILL.md` (+ optional `references/*.md` for interview question banks)

Contract (spec §6, all five steps + properties):
- **Step 0 Environment:** run `./scripts/bootstrap` if `.env`/`node_modules` missing; verify gates once.
- **Step 1 Idea:** interview (has idea → clarify: user, pain, alternative, wedge; no idea → generate 3 candidates from user's interests via idea template rubric, score, pick). **Fit-check gate:** idea requiring mobile/ML-pipeline/realtime-heavy/non-web → honest "Liftkit isn't built for this" + what it IS built for; STOP (do not scaffold garbage).
- **Step 2 PRD:** fill `docs/templates/prd.md` → `docs/prd.md`; user approves before proceeding. Commit.
- **Step 3 Specs:** 2–3 first features via `docs/templates/spec.md` → `docs/specs/`; each spec includes test scenarios section. Commit.
- **Step 4 Adaptation:** project rename (package.json name, layout metadata, README title, OG image text); tokens minimal brand pass (ask for a hue preference, adjust primary in globals.css both themes); **domain schema**: design entities from PRD → extend `src/db/schema.ts` → `pnpm db:generate && pnpm db:migrate` (never edit applied); **factories + seed grow with domain** (spec §5.8): factory per entity, seed creates linked realistic rows; fill `docs/manifest.md`; update `docs/qa/project-profile.md` product fields. Commit per sub-step.
- **Step 5 First run:** `pnpm dev`, agent smoke-checks (page loads, sign-in state, db query works via seed data); hand over the map: roadmap.md seeded from PRD features, "next: `/feature <first-feature>`", playbooks index, data-lifecycle note (.pglite). Final commit.
- **Properties:** linear; every step commits (resume via git log — skill's own header explains resume: find last `liftoff:` commit, continue from next step); each user-facing question is ONE question; never proceeds past PRD without explicit approval; English artifacts, user's language for chat.

- [ ] Write SKILL.md implementing the contract (steps with exact commands, commit-message convention `liftoff: step N — <what>`).
- [ ] Dry validation: skill loads (frontmatter parses), every referenced path/command exists.
- [ ] Commit: `feat: /liftoff onboarding skill`

### Task 6: Skills — feature, review, verify

**Files:** `.claude/skills/feature/SKILL.md`, `.claude/skills/review/SKILL.md`, `.claude/skills/verify/SKILL.md`

- **feature** (distill kro-glo-feature, simplified, no external trackers): input = feature name/description or spec path. Steps: (1) spec exists? no → write via template, user approves; (2) plan slice touch-points; (3) implement as feature slice per architecture.md; (4) **tests mandatory** — levels per testing.md decision table, prove-can-fail rule; (5) run verify skill's gate set; (6) self-review vs spec + rules (or invoke review skill for bigger diffs); (7) **doc actualization** — manifest/roadmap/spec status, ADR if a decision was made; (8) commit(s) conventional, merge per git.md. Explicit STOP conditions (spec ambiguity → ask; gate red after 2 fix attempts → report).
- **review**: adversarial pass over current diff (or given range): correctness vs spec, rules compliance (each rules file = a lens), test honesty (can-fail check), security lens (boundaries validated, secrets). Output: findings by severity to chat + optionally `docs/code-review/<date>.md`; offers to fix Critical/Major.
- **verify**: one command sequence with interpretation: `pnpm lint && pnpm test && pnpm test:e2e && pnpm build` + browser smoke of changed surfaces (dev server, check affected routes render, no console errors); reports each gate PASS/FAIL with next action on FAIL. Never claims success without output evidence (qa-pilot principle).

- [ ] Write all three; cross-references consistent (feature→verify/review by name).
- [ ] Commit: `feat: feature, review, verify skills`

### Task 7: Skill — deploy + engineering playbooks

**Files:** `.claude/skills/deploy/SKILL.md`, `docs/playbooks/deploy.md`, `docs/playbooks/billing.md`

- **deploy skill**: thin driver — reads `docs/playbooks/deploy.md`, walks user through it step-by-step with checkpoints; owns nothing itself.
- **deploy playbook**: prerequisites (GitHub repo pushed, Vercel account); steps: create Neon or Supabase Postgres (agent guides, user clicks) → `vercel` link/deploy or dashboard import → env vars (DATABASE_URL, LIFTKIT_DB=remote, AUTH_SECRET via `npx auth secret`, AUTH_TRUST_HOST note — Vercel auto-trusted, OAuth callback URLs update) → `pnpm db:migrate` against prod URL → smoke check → custom domain (optional). "Done when": live URL serves /, sign-in works, Lighthouse spot-check.
- **billing playbook**: Stripe account → products/prices (guidance: start ONE price) → env keys → checkout route + webhook handler pattern (follows the exemplar action patterns; POINTS to spec-first: run `/feature billing-checkout` with this playbook as input — playbook provides the domain knowledge: webhook signature verification, idempotency, test mode vs live, customer portal) → "done when": test-mode purchase completes and webhook recorded.

- [ ] Write all three; every CLI command real; disclaimer on billing (Stripe docs evolve — verify current API).
- [ ] Commit: `feat: deploy skill and engineering playbooks (deploy, billing)`

### Task 8: Business playbooks (5× lite)

**Files:** `docs/playbooks/pricing.md`, `landing.md`, `analytics.md`, `compliance.md`, `ai-integration.md`

Contracts (each ≤2 pages, steps runnable by the user's agent, distilled from Katya's practice — mrr-lab/fortnoise/pawfile patterns, written fresh):
- **pricing**: value metric → 1–3 tiers heuristics → cost floor worksheet (infra + AI tokens per user + your time) → founding-price / raise-later mechanics → upsell slots (custom work, priority support). "Done when": price on landing + rationale in decisions/.
- **landing**: section order (hero offer → problem → how → proof → price → FAQ), one-message rule, conversion basics (single CTA, social proof slots), where to host (this same app: `/feature landing-page` with this playbook), measure via analytics events.
- **analytics**: enable the PostHog slot (env) → event naming convention (`area.object_action`) → the 6 starter events (signup, activation-moment, core-action, paywall-view, purchase, churn-signal) → weekly review ritual (3 questions). "Done when": events visible in PostHog on golden path.
- **compliance**: **disclaimer first (not legal advice)**; data inventory table (what/where/why/retention) → privacy policy + ToS from PRD data (agent drafts, user reviews with counsel if stakes) → consent points (signup checkbox, cookie banner only if tracking pre-consent) → deletion path (user request → cascade delete, FK cascade already in schema) → jurisdiction note (GDPR baseline; adapt: 152-ФЗ etc.).
- **ai-integration**: when AI belongs in the product (v1: one narrow assist, not a platform); Claude API quickstart pointer (`@anthropic-ai/sdk`, `claude-sonnet-5` default; API key = env var via schema); the three patterns with code sketches (generation, extraction-to-zod-schema, chat with history in db); cost control (cache system prompts, cap tokens, log usage per user); quality bar (evals-lite: golden examples in tests); rate-limit helper reuse.

- [ ] Write all five per contracts.
- [ ] Commit: `feat: business playbooks — pricing, landing, analytics, compliance, ai-integration`

### Task 9: qa-pilot bridge + bootstrap hook

**Files:** `docs/qa/project-profile.md` (pre-filled for THIS stack per qa-pilot's onboard output format — read `/Users/ekaterinapustovaa/Documents/Pet-projects/qa-pilot/skills/onboard/SKILL.md` for the profile schema; fill stack/frameworks/conventions/commands from the real repo; leave product-specific fields as marked placeholders /liftoff fills), `scripts/bootstrap` (final message gains one line: optional `/plugin marketplace add grooownow/qa-pilot` recommendation), `README.md` (Testing section: built-in harness + qa-pilot companion note).

- [ ] Profile validates against qa-pilot's expected sections; bootstrap still shellcheck-clean; e2e webServer unaffected.
- [ ] Commit: `feat: pre-filled qa-pilot profile and companion recommendation`

### Task 10: Golden-path validation — real /liftoff run

**The gate for the whole plan.** In a throwaway copy (NOT the repo): `git clone <repo> /tmp-scratchpad/liftkit-goldenrun && cd && ./scripts/bootstrap --ci`, then drive a REAL agent session through /liftoff with a fixed test idea ("Trailhead — a SaaS for indie hikers to plan and share multi-day trail itineraries"; has clear entities: trips, days, waypoints, gear lists).

- [ ] Execute /liftoff steps 0–5 as the buyer's agent would (subagent with the skill text as its instructions, working in the copy).
- [ ] Assert outcomes: PRD exists + approved-marker; 2 specs with test scenarios; schema has domain tables + migration applied; factories/seed extended (seed inserts linked rows); manifest filled; all gates still green in the ADAPTED project (`pnpm lint && pnpm test && pnpm build`); commits follow `liftoff:` convention; resume property (kill mid-step-3, restart, continues correctly) — test at least once.
- [ ] Every friction/failure found → fix the SKILL (not the test run), rerun affected step.
- [ ] Write findings to `docs/superpowers/qa/2026-07-09-liftoff-goldenrun.md` (internal); delete the throwaway copy.
- [ ] Commit: `test: /liftoff golden-run findings and skill fixes`

---

## Plan 3 Definition of Done

- Buyer-visible: clone → bootstrap → `/liftoff` → adapted, running, gate-green project for a real test idea (proven by Task 10, incl. resume).
- Rules system complete (6 files, enforcement named), entries thin (CLAUDE.md/AGENTS.md ≤40 lines), templates + manifest + ADR seed in place.
- 5 skills + 7 playbooks shipped, cross-references all resolve, every command/path real.
- All Plan-2 deferred minors closed (or consciously re-deferred with note).
- `pnpm lint && pnpm test && pnpm test:e2e && pnpm build` green on main after merge.
