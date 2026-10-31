# Gridfin marketing landing

Multilingual static landing for Gridfin (the product this repo builds — brand
decision: `marketing/seo/2026-07-31-keyword-research.md` §2). Content
lives as data, pages are generated — a new language costs one translation pass
plus one `i18n:check` run, never a page rewrite. Full brief:
`marketing/strategy/2026-07-31-landing-i18n-brief.md`. The page itself is the
RU v2 design (mockup: `gridfin.pen` in the repo root, frame «RU v2 — Skeleton»,
14 sections; design system: `marketing/strategy/landing-design-system.md`).

## Layout

- `content/schema.json` — the contract: locale roster, key set, length budgets
- `content/glossary.json` — terms that must survive translation verbatim
- `content/en.json`, `ru.json` — human-written sources (EN is the MT source)
- `content/{de,es,pt-br,fr,ja}.json` — translations: every leaf carries
  `from` (12-hex hash of the source string — mismatch = stale) and
  `status: mt | mt-reviewed | human`
- `scripts/i18n-check.ts` — the gate; red output means the site won't build
- `scripts/build.ts` — generator: JSON + template → `dist/<locale>/index.html`,
  root redirect `/ → <BASE_URL>/en/`, `sitemap.xml` (hreflang alternates),
  `robots.txt`, and the two photo assets copied into `dist/assets/`
- `dist/` — build output, gitignored

Product artifacts on the page (terminal output, file trees, PRD headers, gate
results) are hardcoded in `build.ts` and identical in every locale — they are
real repository artifacts, not marketing copy (the honesty rule).

## Commands (from the repo root)

- `pnpm i18n:check` — validate all locale files
- `pnpm landing:build` — check + build into `landing/dist/`
- `pnpm vitest run --project landing` — the landing test suite

Env overrides for the build (only absolute `http(s)://` values are honoured —
Vitest injects its own `process.env.BASE_URL`, which is ignored):

- `BASE_URL` (default `https://ludvik4.dev/gridfin`) — host of EN + MT locales
- `RU_BASE_URL` (default `https://ludvik4.ru/gridfin`) — host of the RU page
  (cross-domain hreflang; RU is canonicalized there and excluded from the
  sitemap `<loc>` entries)
- `CTA_URL` (default: mailto to `CONTACT_EMAIL` with a prefilled subject; the
  build prints a note while unset)
- `CONTACT_EMAIL` (default `ludvik4good@gmail.com`) — substituted into the
  `[email]` content slot at render time

## Deploy shape (two hosts from one dist)

- `dist/*` (minus `ru/`) → `https://ludvik4.dev/gridfin/` — all switcher links
  are absolute, so the path prefix is safe.
- `dist/ru/*` → `https://ludvik4.ru/gridfin/` — self-contained: carries its own
  `assets/` copy. The `dist/ru/` copy that also ships inside the `.dev` bundle
  is unreachable dead weight there (correctly canonicalized away) — exclude it
  from the `.dev` upload if the host makes that easy.
- `robots.txt` is only honoured at a host root; since the landing lives under
  `/gridfin`, the emitted `dist/robots.txt` is inert unless the parent site
  mounts it — the parent site's own robots/sitemap wiring should reference
  `sitemap.xml` explicitly.

## Editing rules

1. Change EN copy → every translation of that key goes stale (`from` hash
   mismatch) and `i18n:check` turns red until the translation is refreshed.
2. Never translate glossary terms; the check enforces this.
3. Keys are semantic slots (`hero.h1`, `faq.q7.a`); per-locale content may
   legitimately differ (e.g. `faq.q7` is the Russia-availability question).

## Not wired yet (needs Katya's accounts / decisions)

- Vercel deploy per the shape above (DNS on Vercel for both hosts).
- Beta request form (Tally/Google Forms) → set `CTA_URL` (interim: CTA is a
  mailto to CONTACT_EMAIL with a prefilled subject).
- Analytics (Plausible/PostHog) + UTM discipline — plan §6 of
  `marketing/strategy/2026-07-08-landing-plan.md`.
- Prices: `$—` placeholders in `price.note` (open question №1).
- Contrast debt (upstream in the design system, inherited by the page): body
  text on violet (`#F7F3FF` on `#7B61FF`+glass ≈ 3.2:1) is below WCAG AA —
  needs a design-system decision, not a code fix.
- Skeleton checklist chips (`app/ · playbooks/ · hooks/`) don't match the real
  repo tree shown two sections later in Inside Gridfin (`src/ ·
docs/playbooks/ · lefthook.yml`) — mockup-level honesty defect, needs
  Katya's call (one-line edits in `gridfin.pen` + `build.ts`).
