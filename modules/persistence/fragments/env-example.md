# Fragment: env-example

Splice into `.env.example` (and mirror into a new project's `.env`) at
marker `<!-- module:persistence:env-example -->`. Same var boundary as
`env-schema.md`: `GRIDFIN_DB`/`DATABASE_URL`, the Auth block, and the Seed
block.

```env
# Database: pglite (default, zero deps) | remote (needs DATABASE_URL)
GRIDFIN_DB=pglite
# DATABASE_URL=postgres://gridfin:gridfin@localhost:5432/gridfin

# --- Auth (all optional — skeleton boots with zero config) ---
# Required for any auth flow (sign-in/callback routes 500 without it).
# Generate with: npx auth secret
# AUTH_SECRET=
# Set to true when self-hosting behind a trusted proxy / for local prod-mode
# runs; Vercel is auto-trusted. Without it, /api/auth/* returns 500
# UntrustedHost under `pnpm start` (and any other non-Vercel prod host).
# AUTH_TRUST_HOST=
# GitHub OAuth app client ID
# AUTH_GITHUB_ID=
# GitHub OAuth app client secret
# AUTH_GITHUB_SECRET=
# Google OAuth client ID
# AUTH_GOOGLE_ID=
# Google OAuth client secret
# AUTH_GOOGLE_SECRET=

# --- Auth: local login (credentials) ---
# Dev bypass: when true, you are auto-logged-in as the seeded admin and
# /dashboard needs no sign-in. It lives in `.env.development` (loaded only by
# `pnpm dev`), NOT here — a value in this file would also apply to
# `pnpm build`/`pnpm start`, and the app refuses to run in production with the
# bypass on. Flip it off in `.env.development` to exercise the real login.
# Seeded admin login (dev defaults shown; the sign-in page uses these).
# The seed hashes the password and refuses to run in production.
# SEED_ADMIN_EMAIL=admin@example.local
# SEED_ADMIN_PASSWORD=dev-admin-pw
```
