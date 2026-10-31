---
title: Compliance basics (privacy, ToS, deletion)
status: lite
owner: user's agent
---

# Compliance

**Disclaimer — read first.** This playbook is educational material, not
legal advice. It exists so a solo founder misses nothing obvious. Where
stakes are high — health, finance, children's data, large scale, regulated
markets — consult a lawyer before launch, not after.

## Prerequisites

- PRD exists — the data inventory below is drafted from it.
- The domain schema (`src/db/schema.ts`) reflects what the app actually
  stores — this playbook reads it, not the other way around.

## Step 1: data inventory

The privacy policy is written FROM this table, so fill it first. **Agent
does:** draft it from the PRD + `src/db/schema.ts` + the services actually
enabled; **user does:** correct it. Keep it as `docs/data-inventory.md`
(add it to the docs map in `docs/rules/docs.md` when creating it):

| What                                  | Where                | Why                    | Retention                                            |
| ------------------------------------- | -------------------- | ---------------------- | ---------------------------------------------------- |
| Email, name, avatar                   | Postgres `users`     | account + sign-in      | until account deletion                               |
| OAuth account link                    | Postgres `accounts`  | GitHub/Google sign-in  | until account deletion (cascade)                     |
| _domain data from your schema_        | Postgres             | _purpose from the PRD_ | _decide and write down_                              |
| Error events (may embed request data) | Sentry (if DSN set)  | debugging              | per Sentry's retention setting                       |
| Usage analytics                       | PostHog (if key set) | product decisions      | per PostHog's retention setting                      |
| Payment data                          | Stripe               | billing                | Stripe processes it; card data never touches the app |

## Step 2: privacy policy + ToS

**Agent does:** draft both from the PRD and the data inventory — plain
language, saying exactly what the table says: what is collected, why, which
processors (Vercel, Neon/Supabase, Stripe, Sentry, PostHog), retention, how
to request deletion, a contact address. **User does:** read every line —
you sign this, not the agent — and involve counsel where stakes are high.
Ship as static pages (`/privacy`, `/terms`) linked from the landing footer
and the sign-in screen — a `/feature legal-pages` run.

## Step 3: consent points

- **Signup consent:** before the first account is created. Sign-in here is
  OAuth, so gate the provider buttons with a checkbox ("I agree to the
  Terms and Privacy Policy", linked, unchecked by default) or an equally
  explicit agree step — the standard, defensible baseline.
- **Cookie banner:** only needed if you track before consent. The PostHog
  slot is OFF by default (`src/components/analytics-provider.tsx`). If you
  enable it for every visitor on first paint, GDPR-scope visitors need a
  consent banner before it initializes. Banner-free alternatives: start
  analytics only after signup consent, or use PostHog's cookieless /
  anonymous mode per its current docs.
- **Marketing email:** its own opt-in checkbox — never bundled into ToS.

## Step 4: deletion path

Request → verify it is really the account owner (reply from the account's
email) → delete → confirm.

What the schema does today: `accounts.userId` declares
`onDelete: "cascade"` (`src/db/schema.ts`), so deleting the `users` row
also removes the OAuth account links in the same statement. **Invariant to
keep:** every domain table added later that references `users.id` must also
declare `onDelete: "cascade"`, so deletion stays one
`DELETE FROM users WHERE id = …` — check this in review whenever the schema
grows.

Outside Postgres, deletion is per-processor: cancel the Stripe subscription
and delete the customer, delete the person in PostHog, and note that Sentry
events age out by retention. List these steps honestly in the policy.

## Step 5: jurisdiction note

GDPR is the strictest common baseline — build to it (consent, deletion,
data inventory) and most markets are covered. Then adapt to where your
users actually are: Russia's 152-ФЗ adds data-localization duties for
Russian citizens' data; US state laws (CCPA/CPRA and successors) add
"do not sell/share" disclosures past scale thresholds. Revisit this step
when entering a new market.

## Done when

- The data inventory exists and matches the real schema + enabled services.
- `/privacy` and `/terms` are live, linked from footer and sign-in.
- Account creation is blocked without consent.
- Deleting a test user removes their rows (cascade verified) and the
  per-processor deletion steps are documented in the policy.
