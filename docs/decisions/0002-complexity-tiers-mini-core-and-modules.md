# ADR 0002: Complexity tiers via a mini-core plus additive modules

## Context

Liftkit ships "full": a fresh clone carries a database (Drizzle + PGlite +
migrations + factories + seed), auth (next-auth + middleware + signin +
dashboard + profile), Sentry instrumentation, and e2e — all at once. For a
simple goal (e.g. a freelancer's landing page) that machinery is dead weight:
the buyer maintains code they never use. But the quality bar must not drop — a
landing page still needs tests, gates, invariants, and hooks. Tiers must vary
the **code surface**, not the **rigor**.

The question this ADR settles: how does a project pick a complexity level, and
how does the lighter path avoid physically carrying unused code?

## Options considered

1. **Named presets (2–3)** vs free capability toggles — toggles combinatorially
   explode the states we must test and support; presets are explainable and
   testable. Chosen: presets.
2. **Subtractive prune-on-onboard** (ship full, delete the unneeded machinery
   during `/liftoff`) vs **mini-core + additive modules** (ship minimal, add the
   heavy stack as installable modules). Subtractive keeps one skeleton but
   leaves the light path defined by deletions; additive makes the light path the
   canonical default and the heavy stack an explicit, versioned artifact.
   Chosen: mini-core + additive modules.
3. **Module install by CLI script** vs **agent applies an apply-plan** (the
   `update` skill's idiom) vs a hybrid. A bespoke script is fragile against
   wiring into already-modified code and is its own maintenance burden; the
   agent-applied apply-plan reuses an idiom the repo already has. Chosen:
   agent-applied apply-plan.
4. **Module granularity:** fine-grained (db, auth, middleware as separate
   modules) vs coarse, preset-aligned modules. The import graph is a chain — db
   → auth → middleware/dashboard — so they cannot be separated; a coarse
   `persistence` module is the real seam. Chosen: coarse, preset-aligned.

## Decision

Invert the template's default: the canonical skeleton becomes a minimal
**Landing** core, and the heavy stack moves into a `modules/` catalog installed
by the agent via each module's `module.md` apply-plan. Three presets — Landing
(core), App (core + `persistence`), App+Billing (core + `persistence` +
`billing`). `/liftoff` picks the preset during idea discussion (after the
fit-check) and applies the preset's modules during adaptation. The first
iteration proves the mechanism by extracting one real module, `persistence`
(db+auth), which is the actual light/heavy seam.

## Consequences

- **Easier:** a fresh clone is light; a landing project never carries db/auth;
  the heavy stack is an explicit, reviewable, versioned artifact under
  `modules/`.
- **Harder:** the core must compile and stay gate-green without db/auth
  (`env.ts`, `page.tsx`, deps, scripts all shrink); gates and skills become
  preset-aware (`verify`, `deploy`, the manifest gains `## Preset` /
  `## Installed modules`); `/liftoff` grows a preset choice and a conditional
  module-apply step.
- **Forecloses nothing yet:** `billing`, a finer Sentry/e2e split, and a
  standalone `add-module` skill (for a Landing project that later wants App) are
  deferred but fit the same apply-plan mechanism. The `pretooluse` hook is
  unchanged — invariant #2 (no db in middleware) simply goes inert without the
  `persistence` module.

The module format this decision introduces — what a `modules/<name>/`
directory must contain, and how its apply plan is followed — is specified in
`docs/rules/modules.md`.

## Status

`accepted`

**Phase 1 implemented** (2026-07-15): the mechanism (module format +
validator, deterministic `pnpm module:apply`, CI round-trip proof) and the
`persistence` extraction landed — a fresh clone is now the Landing core
described above, and `modules/persistence/` reproduces App on install. Preset
_selection_ inside `/liftoff`, preset-aware skills (`verify`, `deploy`), and
the `docs/manifest.md` preset/module fields were Phase 2 (below).

**Phase 2 implemented** (2026-07-16): preset selection landed in `/liftoff`
(Step 1 asks Landing/App/App+Billing; a conditional Step 4 sub-path applies
the preset's modules), the manifest gained `## Preset` and `## Installed
modules`, `verify` and the `deploy` playbook became preset-aware (db-reset
gate and managed-Postgres provisioning both conditional on `persistence`),
and CLAUDE.md invariant #2 was scoped to projects with `persistence`
installed. The feature is end-to-end: a fresh clone onboards as either tier.

**Phase 3 implemented** (2026-07-16): the `observability` module extracted
Sentry out of core — Landing no longer carries `@sentry/nextjs` or the
instrumentation files, App/App+Billing auto-install it via their preset field.
The `add-module` skill landed, so a project that started as Landing can pull
in `persistence` or `observability` later without re-running `/liftoff`.
Billing was decided: it stays knowledge-not-code, App+Billing is core +
`persistence` + a billing roadmap intent built per-project via
`/feature billing-checkout` against `docs/playbooks/billing.md`, not a
`modules/billing/` extraction.
