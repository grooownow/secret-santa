---
title: Landing page that converts
status: lite
owner: user's agent
---

# Landing

Domain knowledge for the landing page, not an implementation guide: section
order, the one-message rule, and the conversion basics the spec must
capture. Implementation is a `/feature` run; measurement is
`docs/playbooks/analytics.md`.

## Prerequisites

- PRD exists — the landing page sells the PRD's promise, nothing else.
- A price (or founding price) from `docs/playbooks/pricing.md` — a landing
  page without a price is a brochure.

## The one-message rule

The page makes exactly one claim: who it is for + what painful thing goes
away. Every section either supports that claim or gets cut. Test: a
stranger reads only the hero for 5 seconds and can say what the product
does and for whom.

## Section order

1. **Hero offer** — the one-sentence claim, a subline naming the audience,
   the CTA. No carousel, no autoplay video, no "welcome".
2. **Problem** — 2–3 sentences in the customer's own words about the pain;
   the reader should think "that's me".
3. **How it works** — 3 steps max, each one line + optional screenshot.
4. **Proof** — social-proof slots (below).
5. **Price** — the actual number from the pricing ADR, with the
   founding-price label if applicable. Hiding the price loses exactly the
   visitors you want.
6. **FAQ** — the 4–6 real objections (data safety, cancellation, "will it
   fit my case"), answered honestly.

## Single CTA

One call to action, repeated: in the hero, after proof, after price. Same
verb, same destination (sign-up or checkout) everywhere. Every extra choice
— a second button, nav links, "learn more" — leaks conversions. Navigation
on a landing page is optional; a second CTA is a bug.

## Social-proof slots

Wire empty slots into the layout at launch and fill them as proof lands:

- 1–3 customer quotes (name + face/handle beats anonymous).
- One honest number: users, items processed, stars — never invent one.
- Logos only when recognizable; three unknown logos are noise.

Until real proof exists, a founder note ("I built this because …") is
honest and converts better than fake badges.

## Build it via the feature skill

Run `/feature landing-page`, feeding this playbook as domain input for the
spec. The feature skill owns the implementation (spec → plan → code → tests
→ verify → review); the spec must capture: the section order above, the
single CTA destination, the price from the pricing ADR, and the analytics
events below. `docs/rules/frontend.md` applies — tokens, responsiveness,
a11y.

## Measure it

The landing page is the top of the funnel measured in
`docs/playbooks/analytics.md`. At minimum it emits `landing.cta_clicked`
(named per the `area.object_action` convention there); the rest of the
funnel — signup, activation, paywall, purchase — is covered by the six
starter events. Review weekly per the analytics ritual.

## Done when

- All six sections ship in order, with a single CTA destination.
- The price shown matches the pricing ADR.
- `landing.cta_clicked` appears in PostHog when the CTA is clicked
  (slot enabled per `docs/playbooks/analytics.md`).
