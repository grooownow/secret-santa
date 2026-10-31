---
title: Billing with Stripe
status: lite
owner: user's agent
---

# Billing

This is domain knowledge, not an implementation guide: what Stripe billing
requires to be done safely, so the `feature` skill can build it spec-first.
It does not replace the spec/implementation flow — it feeds it.

**Disclaimer:** the Stripe API and dashboard evolve. Verify the current API
version, SDK methods, and dashboard navigation against Stripe's own docs
(docs.stripe.com) at implementation time — this playbook gives the shape of
the integration, not a frozen code sample.

## Prerequisites

- A Stripe account (stripe.com) — test mode is enabled by default, no live
  charges until you explicitly activate the account.
- The app already deployed (or at least reachable at a stable URL) — Stripe
  webhooks need a URL to call.

## Concepts the agent needs before building

- **Test mode vs. live mode.** Every object (customer, price, webhook
  endpoint) is scoped to one mode. Build and verify the entire flow in test
  mode — using Stripe's test card `4242 4242 4242 4242` — before switching
  API keys to live.
- **Webhook signature verification is mandatory.** Never trust a webhook
  payload without verifying its Stripe-Signature header against the
  endpoint's signing secret. An unverified webhook handler is a forgeable
  "mark this order paid" endpoint — treat this as a security requirement,
  not an optional hardening step (`docs/rules/security.md`'s "validate every
  boundary" applies here too).
- **Idempotent event handling.** Stripe can and will redeliver the same
  webhook event. The handler must be safe to run twice: check whether the
  event's id (or the resulting state change) was already applied before
  acting, typically via a unique constraint or an `stripe_event_id` column
  checked before processing.
- **Customer portal.** Stripe's hosted billing portal (a single API call to
  create a portal session) covers plan changes, cancellation, and invoice
  history — build this before any custom "manage subscription" UI; it's
  usually all a v1 needs.

## Step: build it via the feature skill

Run `/feature billing-checkout`, feeding this playbook as domain input for
the spec. The feature skill owns the actual implementation (spec →
plan → code → tests → verify → review); this playbook supplies the
requirements the spec must capture:

- One checkout flow: create a Checkout Session (or Payment Element) for a
  single price, redirect the user to Stripe-hosted checkout.
- One webhook route that verifies the signature, handles at minimum
  `checkout.session.completed`, and writes the resulting entitlement/order
  row idempotently.
- One portal-session route so paying users can manage their own
  subscription.
- Test scenarios per `docs/rules/testing.md`: a successful checkout webhook
  updates the db exactly once even if delivered twice; an unsigned/forged
  webhook payload is rejected.

## Start with ONE price

Resist modeling tiers/add-ons before the first paying customer exists.
Create a single Stripe Product with a single Price (Stripe dashboard:
Products → Add product) and wire the whole flow around it. Expand pricing
structure later via `docs/playbooks/pricing.md`, once real usage data
exists.

## Environment variables

Stripe keys are secrets and must go through the typed env schema, not be
read as bare `process.env` calls — per `docs/rules/security.md`, adding a
var means all three: an entry in `src/lib/env.ts`, a documented line in
`.env.example`, and a case in `src/lib/env.test.ts`. Expected vars:

- `STRIPE_SECRET_KEY` — server-side only, never exposed to the client.
- `STRIPE_WEBHOOK_SECRET` — the signing secret for the webhook endpoint
  (Stripe dashboard: Developers → Webhooks → your endpoint → "Signing
  secret"), used to verify the Stripe-Signature header.
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — only if using client-side Stripe.js
  (e.g. embedded Payment Element); skip it if checkout redirects fully to
  Stripe-hosted pages.

## Done when

- A test-mode purchase completes end-to-end (Stripe-hosted checkout with
  the test card, redirect back to the app).
- The corresponding webhook event is recorded in the database exactly once,
  verified by re-sending the same event (Stripe dashboard: Developers →
  Webhooks → endpoint → an event → "Resend") and confirming no duplicate
  row is created.
