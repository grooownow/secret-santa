---
title: Pricing your product
status: lite
owner: user's agent
---

# Pricing

Domain knowledge for setting the first price: pick a value metric, choose a
tier structure, check the cost floor, launch with a founding price. The
outcome is a number on the landing page plus an ADR explaining it — not a
pricing engine.

## Prerequisites

- PRD exists — you need to know who pays and for what.
- Billing decided or in progress (`docs/playbooks/billing.md` — start with
  ONE price; this playbook decides what that price is).

## Step 1: pick the value metric

The value metric is the unit the price scales with. Pick the one that grows
when the customer gets more value — seats, projects, documents processed,
messages. Test: "if my customer doubles their usage of X, would they agree
they got twice the value?" If no metric passes, charge a flat subscription.

## Step 2: tiers — 1 to 3, never more at launch

- **1 tier** (default): one price, one plan. Least friction, fastest signal
  on willingness to pay. Right for almost every v1.
- **2 tiers**: only when two clearly different buyer types already exist in
  the PRD (e.g. solo vs. team).
- **3 tiers**: only with real usage data — the middle tier is the one you
  want bought; the top tier anchors it.
- Free: a trial (time- or usage-limited) beats a forever-free tier. Free
  users are a cost line, not a funnel, until proven otherwise.

## Step 3: cost-floor worksheet

The price must clear the floor with margin. **Agent does:** fill this table
with the user, using real bills and estimates:

| Line                                                                                                                     | $/month |
| ------------------------------------------------------------------------------------------------------------------------ | ------- |
| Infra (Vercel + Postgres + email + other services)                                                                       |         |
| AI tokens per active user (calls × avg tokens × model price — wire usage logging per `docs/playbooks/ai-integration.md`) |         |
| Founder time on support/ops: hourly rate × hours, divided by expected paying users                                       |         |
| **Floor per paying user per month**                                                                                      |         |

Rule of thumb: price ≥ 3–5× the floor. If the floor alone is near the
intended price, the model is broken — cut costs or raise the price.

## Step 4: founding-price mechanics

- Launch LOW on purpose and label it: "founding price — $X until the first
  N customers" (N = 10–50). Cheap to try, honest, urgent.
- Announce every raise in advance ("goes to $Y on <date>"). **Each raise is
  a marketing event**: post it, email the list, thank the founders.
- Grandfather founding customers at their price — they become your
  reference customers and testimonial source.
- Never launch high and discount later: raises build trust, discounts
  destroy it.

## Step 5: upsell slots

Leave named slots to grow revenue without repricing:

- **Custom work** — "we adapt it to your workflow" at a day rate.
- **Priority support** — fixed monthly add-on with a response-time promise.
- **Annual plan** — ~2 months free for cash up front, once monthly
  conversion works.

## Record the decision

Copy `docs/templates/decision.md` to `docs/decisions/<NNNN>-pricing.md`:
context (value metric, floor numbers), options considered (tier structures
rejected), decision (the price), consequences (when and how to raise).

## Done when

- The price is live on the landing page (`docs/playbooks/landing.md`).
- The rationale is recorded as an ADR from `docs/templates/decision.md`.
