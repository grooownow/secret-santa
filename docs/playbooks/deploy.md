---
title: Deploy to Vercel + managed Postgres
status: lite
owner: user's agent
---

# Deploy

Ship this app to production: Vercel hosting + a managed Postgres database
(Neon or Supabase). Driven by the `deploy` skill, one checkpoint at a time.

## Prerequisites

- A GitHub account (repo can be pushed as part of step 1 if not already).
- A Vercel account (free tier is enough — vercel.com, sign in with GitHub).
- Gate sequence green (`verify` skill) — never deploy red.

## Steps

Read `docs/manifest.md` → `## Preset` before starting — it decides which
steps below apply.

**Landing preset:** skip steps 2 (Postgres) and 5 (migrations) entirely — go
straight from step 1 (push to GitHub) to step 3 (Vercel import), and drop
`DATABASE_URL`/`GRIDFIN_DB` and the auth rows (`AUTH_SECRET`/
`AUTH_GITHUB_*`/`AUTH_GOOGLE_*`) from step 4's env table. The "Production
auth checklist" section doesn't apply. Steps 3, 4 (minus the dropped rows),
6, 7 still apply — step 6's smoke check is just `/` renders, no sign-in
round-trip.

**App / App+Billing preset:** run every step below in order, including the
Postgres/migration steps and the full env table.

### 1. Push the repo to GitHub

**Agent does:** check `git remote -v`. No remote → create one
(`gh repo create <name> --source=. --private --push` if `gh` is available;
otherwise ask the user to create an empty repo on github.com, then
`git remote add origin <url> && git push -u origin main`).

**Done when:** `main` is visible on github.com.

### 2. Create a managed Postgres database (App/App+Billing only)

**User does** (navigation may differ by provider version — look for the
nearest equivalent action if a label doesn't match):

- **Neon** (neon.tech): sign in → "New Project" → region close to your
  Vercel region → "Connection Details" → copy the **pooled** connection
  string (hostname usually contains `-pooler`).
- **Supabase** (supabase.com): sign in → "New Project" → set a db password →
  Project Settings → Database → "Connection string" → **URI** tab,
  "Transaction" pooling mode.

**Done when:** one Postgres connection string is copied — paste it directly
into Vercel's env UI in step 4, not into chat.

### 3. Import the project into Vercel

**Dashboard path (first-timers):** vercel.com/new → "Import Git Repository"
→ select the repo from step 1 → Next.js preset auto-detects → add env vars
first (step 4) before the first deploy.

**CLI alternative:** `npx vercel link`, then `npx vercel` for a preview or
`npx vercel --prod` once env vars are set.

**Done when:** the project exists in the Vercel dashboard (a failed first
build is expected — env vars aren't set yet).

### 4. Set environment variables

**User does** (dashboard: Project → Settings → Environment Variables; CLI:
`npx vercel env add <NAME>`); **agent does** helps produce the values.
**Landing preset:** skip the `DATABASE_URL`, `GRIDFIN_DB`, and every
`AUTH_*` row below — only `NEXT_PUBLIC_APP_URL` applies.

| Variable                                                       | Value                                                                 |
| -------------------------------------------------------------- | --------------------------------------------------------------------- |
| `DATABASE_URL` (App/App+Billing only)                          | The connection string from step 2.                                    |
| `GRIDFIN_DB` (App/App+Billing only)                            | `remote` — switches off local PGlite.                                 |
| `AUTH_SECRET` (App/App+Billing only)                           | `npx auth secret` (agent runs, gives the user the printed value).     |
| `AUTH_TRUST_HOST` (App/App+Billing only)                       | Not needed on Vercel (auto-trusted). Only for self-hosting elsewhere. |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` (App/App+Billing only) | If GitHub sign-in is used — see callback note below.                  |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` (App/App+Billing only) | If Google sign-in is used — see callback note below.                  |
| `NEXT_PUBLIC_APP_URL`                                          | The production URL Vercel assigns (or custom domain from step 7).     |

**OAuth callback URLs** (App/App+Billing only) — update before sign-in works in production:

- GitHub OAuth App → "Authorization callback URL" →
  `https://<your-domain>/api/auth/callback/github`
- Google Cloud Console → Credentials → OAuth client → "Authorized redirect
  URIs" → `https://<your-domain>/api/auth/callback/google`

**Done when:** vars are set and the redeploy succeeds.

### 5. Run migrations against production (App/App+Billing only)

**Agent does**, from your local machine (never edit an applied migration —
`docs/rules/architecture.md`):

```bash
GRIDFIN_DB=remote DATABASE_URL="<connection string from step 2>" pnpm db:migrate
```

**Done when:** exits 0, reports the applied migrations.

### 6. Smoke check

**Agent does:** `curl -I https://<your-domain>/` (expect `200`); then a real
browser pass. **Landing preset:** `/` renders — that's the whole check.
**App/App+Billing:** `/` renders, and `/signin` completes an actual sign-in
round-trip.

**Done when:** both checks pass with quoted evidence.

### 7. Custom domain (optional)

**User does:** Vercel → Settings → Domains → add domain → follow the DNS
records shown (usually `CNAME`/`A` at your registrar). **Agent does:** once
DNS resolves, update `NEXT_PUBLIC_APP_URL` and OAuth callback URLs to match.

**Done when:** the domain serves the app over HTTPS.

### 8. Deploy gate — keep red builds out of production

Gridfin's CI turns red on a broken build, but **nothing stops a red branch
from being merged or deployed unless this step is done.** Parts of it live in
GitHub/Vercel settings the agent cannot change — so the agent's job here is
to check, explain, and hand over; never to silently skip.

**Agent does:** check whether `main` is protected:

```bash
gh api repos/<owner>/<repo>/branches/main/protection --jq .url
```

- **200** → protection exists. Confirm required status checks include the CI
  jobs (`quality`, `e2e`, `materialized-app`) and move on.
- **404** (protection never configured) or **403** with "Upgrade to GitHub
  Pro" (private repo on the Free plan) → show the user this warning verbatim
  and wait for their choice:

> ⚠️ **Your production pipeline has no enforced gate.** CI will turn red on a
> broken build, but nothing physically prevents merging or deploying it.
> I can't change this from here — it's a GitHub/Vercel account setting.
> Your options:
>
> 1. **Branch protection** (needs a public repo or GitHub Pro): Settings →
>    Branches → Add rule for `main` → require status checks `quality`, `e2e`,
>    `materialized-app`. Strongest option — merges of red branches become
>    impossible.
> 2. **Release-branch gating** (works on the Free plan): in Vercel → Settings
>    → Git, set the Production Branch to `production`. From then on I deploy
>    by fast-forwarding `production` to `main` — and I will always check that
>    CI on `main` is green first (`gh run list`), so a red build never gets
>    pushed to the production branch.
> 3. **Accept the risk**: keep deploying from `main` and rely on discipline
>    (`pnpm gates` before every push). Cheapest, weakest — one hasty push
>    ships a broken build.

**Agent does after the choice:** record it in `docs/manifest.md` under
`## Deploy` (one line, e.g. `Deploy gate: release-branch (production)`), so
future sessions know which flow this project uses. If option 2 was chosen,
every later deploy goes:

```bash
gh run list --branch main --limit 1 --json conclusion   # must be "success"
git push origin main:production
```

**Done when:** one of the three options is explicitly chosen by the user and
recorded in the manifest — "we never talked about it" is the only wrong
outcome.

- Set `AUTH_DEV_BYPASS=false` in the production env vars (step 4) — the app
  refuses to boot otherwise (`src/lib/env.ts` throws at startup).
- Do **not** run `pnpm db:seed` against production — it refuses when
  `NODE_ENV=production`; create the first real user manually instead.
- Set `AUTH_SECRET` (already listed in step 4's table) — required in
  production.

## Done when (overall)

- Live URL serves `/` with a real 200 and expected content.
- A deploy-gate choice (step 8) is recorded in `docs/manifest.md` — the user
  explicitly picked protection, release-branch gating, or accepted the risk.
- **App/App+Billing only:** sign-in works end-to-end on the live URL.
- Lighthouse spot-check (Chrome DevTools panel, or `npx lighthouse <url> --view`)
  is in the same range as the local budget in `lighthouserc.js`
  (performance + accessibility ≥ 0.90).

## Notes

- `src/lib/rate-limit.ts` is in-memory, per-instance — fine for a single
  deployment; scaling to multiple instances needs a store-backed limiter
  (`docs/rules/security.md`).
- Local dev keeps using PGlite; only the deployed environment needs
  `GRIDFIN_DB=remote`.
