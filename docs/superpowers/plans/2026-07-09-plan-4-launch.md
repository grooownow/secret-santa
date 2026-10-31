# Liftkit Plan 4: Launch — Implementation Plan

> **For agentic workers:** Tasks 1–2 are executable now; Tasks 3–6 have external dependencies (accounts, design, copy choice) and run with Katya in the loop.

**Goal:** Package the finished template into a sellable product: license, versioning, a clean buyer-facing repo, purchase/delivery flow, landing page, beta distribution.

**Key architectural decision — two repos:**
- **Dev repo** (this one, `Pet-projects/liftkit`): private, holds everything incl. internal docs (`docs/superpowers/`, `docs/marketing/`), plans, marketing strategy. Katya works here.
- **Template repo** (`liftkit-template`, GitHub private): what buyers get access to. Produced by an export script from the dev repo — internal content mechanically excluded, so a leak is structurally impossible rather than a matter of discipline. Marked as a GitHub template repo ("Use this template").

## Global Constraints

- Shipped tree stays English; no internal jargon; gates green after every task.
- Export exclusion list is code (one place), not a checklist.
- License is plain-language commercial (ShipFast-class simplicity), NOT legal advice for buyers' products (compliance playbook covers that).

---

### Task 1: LICENSE + CHANGELOG (execute now)

- `LICENSE.md`: commercial single-purchase license — buyer may build unlimited own and client products; full ownership of what they build; may NOT resell/redistribute/republish the template or substantial parts as a template/starter/boilerplate; no repo-access sharing beyond their team; updates included, support best-effort; no warranty. Plain English, short.
- `CHANGELOG.md`: Keep-a-Changelog-style; `0.1.0` initial release entry (skeleton, skills, playbooks, gates); header section "How updates reach you" — template-copy model: releases ship notes + an agent prompt-plan ("give this to your agent to apply"), new projects just take the newest template.
- README: License section (one line + pointer), Updates note.
- Gates green; commit.

### Task 2: Template export mechanism (execute now)

- `scripts/export-template.sh` (dev-repo-only tool; excluded from its own export): produces a clean buyer tree from HEAD via `git archive`, then removes the exclusion list: `docs/superpowers/`, `docs/marketing/`, `scripts/export-template.sh`. Flags: `--out <dir>` (default a temp dir), `--verify` (runs `./scripts/bootstrap --ci` + `pnpm build` inside the export — the buyer's literal first-run), `--push <git-remote>` (force-pushes the export as the template repo's `main` — used by Task 3 and every future release).
- Verification (mandatory): run with `--verify`; assert export contains LICENSE/CHANGELOG/skills/playbooks and contains NO internal paths (scripted assertions inside the tool, not manual eyeballing).
- Gates green in dev repo; commit.

### Task 3: GitHub template repo (needs Katya's gh account, ~15 min)

- `gh repo create liftkit-template --private`; run export `--push`; enable "Template repository" in settings; verify CI runs green on the template repo (first real GitHub Actions run — the workflow has never executed remotely); protect main.
- Also: push the DEV repo itself to a private GitHub remote (backup + CI for development).
- Buyer-access model (MVP per spec §9): purchase → collect GitHub username → `gh api` collaborator invite with `pull` (read) permission. Document the 3-command invite ritual in `docs/marketing/` (internal).

### Task 4: Sales flow (LemonSqueezy; Katya in the loop, ~1 hour)

- LemonSqueezy store + product ($0 beta coupon / $10 founding price per marketing strategy), checkout collects GitHub username custom field; thank-you page/email states the invite arrives within 24h (manual for MVP).
- Beta phase: skip LS entirely — direct invites (Task 6).

### Task 5: Landing page (blocked on: Katya's .pen design + A/B copy choice in docs/marketing/landing-copy.md)

- Per docs/marketing/2026-07-08-landing-plan.md: separate `liftkit-landing` repo, static index.html, EN/RU via ?lang=, phase-A CTA (early access form), Plausible/PostHog counter, deploy to Vercel. Build only after design + copy land.

### Task 6: Beta distribution (after 3–5)

- Checklist per beta tester: repo invite → they run bootstrap + /liftoff → structured feedback form (what stalled, minutes-to-running-app, would-you-pay). Findings loop back into the skills exactly like the golden run did.

## Definition of Done (Plan 4 overall)

- A stranger with a GitHub invite can: clone template repo → bootstrap → /liftoff → working product; nothing internal visible to them.
- Every release reproducible: bump CHANGELOG → run export --push → template repo updated.
- Beta testers onboarded with a feedback loop.
