# Rule: Frontend

**Applies to:** any page, component, mutation, or loading state — responsiveness
is an invariant here, not a nice-to-have (spec §5.6).

## The five responsiveness rules

1. **SPA navigation always.** Internal links go through `<Link>` (see
   `src/app/page.tsx`) — never a raw `<a href>` or `window.location` for an
   in-app path. Enforcement: `no-restricted-properties`/`no-restricted-globals`
   on `window.location` in `eslint.config.mjs` are **errors** (red `pnpm lint`);
   `nextjs(no-html-link-for-pages)` is also enforced by oxlint (error — red
   `pnpm lint`); the e2e test `tests/e2e/smoke.spec.ts` → _"SPA-navigation gate"_
   is the secondary behavioral check, which asserts client-side nav doesn't wipe
   `window` state (CI job `e2e`).
2. **Auth without a network call per click.** Sessions are stateless JWT
   cookies; `src/middleware.ts` only decodes the cookie locally via
   `auth.config.ts` (no adapter, no db import) — see the anti-pattern warning
   in its header comment. Real authorization happens in the data layer via
   `requireUser()` (`src/features/auth/require-user.ts`), called from every
   protected server component/action. Never add a db/network call to
   `src/middleware.ts` or its edge-safe config.
3. **Instant response to mutations.** Client mutations are optimistic —
   exemplar: `src/features/profile/profile-form.tsx` (`useOptimistic` +
   `useActionState`): UI updates on submit, rolls back only if the server
   rejects it. Copy this shape for new mutating forms.
4. **No white screens.** Server Components render first paint; a route with
   an async data dependency ships a `loading.tsx` skeleton (`animate-pulse`
   blocks shaped like the real content — see `src/app/dashboard/loading.tsx`),
   never a bare spinner.
5. **No waterfalls, no heavy client bundles.** Server Components by default;
   `"use client"` only at leaf components that need state/effects/browser
   APIs; independent data fetches run in parallel, not chained awaits.

## Gates (checked, not on trust)

- Lighthouse CI (`lighthouserc.js`, job `lighthouse` in `.github/workflows/ci.yml`):
  Performance and Accessibility both `≥ 0.90` on `/` and `/signin`, against a
  production build (`pnpm build` + `pnpm start`). Red on regression.
- `verify` skill re-runs the e2e SPA-navigation check and a manual click-response
  pass on changed surfaces.
- `feature` skill's review step checks new/changed code against rules 1–5
  above before calling a slice done.

## Desktop layout

One codebase, one breakpoint: the desktop layout starts at `lg` (1024px) and a
phone never changes. `PageMain` (`src/components/page-main.tsx`) is the content
area of every page with a header: the `santa-page` utility gives the 1120px
column, and each direct child stays in a readable 704px column unless its root
carries `data-wide` (screens laid out in columns). A new page with a header uses
`PageMain`, never its own `<main>`. The cabinet menu comes before `<main>` in the
DOM (tabs on desktop) and moves to the bottom on a phone with `max-lg:order-last`.

## Design tokens

`(enforced — hook)` Hardcoded colors in `.tsx` (hex, `rgb()`/`hsl()`/`oklch()`,
arbitrary-value classes like `bg-[#0af]`) trip CLAUDE.md invariant #6: the
`PreToolUse` hook escalates the edit to `ask`. Metadata images
(`opengraph-image.tsx`, `icon.tsx`, …) are exempt — they render standalone and
cannot read the CSS token set. Palette classes (`bg-zinc-900`) are not blocked
by the hook; review catches those.

- Use Tailwind utility classes bound to the token set in `src/app/globals.css`
  (`bg-background`, `text-foreground`, `text-muted-foreground`,
  `text-destructive`, etc.) — never a raw hex or an arbitrary Tailwind color
  (`bg-[#123456]`, `text-gray-500`). `(convention — checked at review)`;
  `prettier-plugin-tailwindcss` keeps class order consistent but does not
  reject raw colors.
- **Documented exception:** `src/app/global-error.tsx` uses inline styles and
  a hand-written `prefers-color-scheme` media query, because it replaces the
  root layout when the tree above it (including `globals.css`/`ThemeProvider`)
  may itself be the thing that failed. Do not copy that pattern anywhere else.
- **Documented exception:** `src/components/google-logo.tsx` carries the four
  official Google brand hex colours as SVG `fill`s, because Google's brand
  guidelines require the exact "G" mark. Only that one file; any other brand
  icon uses `currentColor` (e.g. the Threads mark in `site-footer-view.tsx`).
  `src/tokens.test.ts` checks Tailwind palette classes, not hex, so it needs
  no exemption entry.
- Both themes (light/dark) come from the same token set — a page that only
  uses tokens gets dark mode for free; never hardcode a light-only color.

## The design loop (before the tokens are the question)

This file says which tokens to use. It does not say what the screen should look
like — that is a decision, and a decision made by the agent alone is a decision
nobody chose. The `design` skill runs that loop: it derives `docs/design.md` from
`src/app/globals.css` and `components.json` (the SSOT this file's token rules
point at), puts 3-5 structurally different mockups of a surface side by side in a
real browser, and records what the user picked — and rejected — into
`docs/design-taste.json`, whose weights decay 5% per week so the profile tracks
taste rather than fossilising the first three sessions. Reach for it before
building a new user-facing surface, and after building one to run the
375/768/1280 breakpoint pass. `(convention — checked at review)`

## Accessibility basics

- `jsx-a11y` runs via oxlint (`.oxlintrc.json` → `"plugins": [..., "jsx-a11y"]`,
  `correctness`/`suspicious` at `error`) — e.g. `jsx-a11y(alt-text)` fires on an
  `<img>` missing `alt`. Fix, don't suppress.
- Interactive elements need visible focus and a real accessible name (`aria-label`
  or visible text) — see `ThemeToggle`'s `"Toggle theme"` name and
  `ProfileForm`'s `<Label htmlFor>` pairing for the pattern.
- Contrast comes from the token pairs (`bg-*` with its matching `*-foreground`)
  — don't hand-pick a foreground color against a background token.
- Lighthouse's Accessibility ≥ 0.90 gate (above) is the enforced backstop for
  this section as a whole.

## Gates (self-check before done)

- [ ] No internal `<a href>`/`window.location` navigation
- [ ] No network/db call added to `src/middleware.ts` or `auth.config.ts`
- [ ] New mutation follows the optimistic pattern or documents why not
- [ ] Route with async data has a `loading.tsx`
- [ ] No raw hex/arbitrary color classes outside `global-error.tsx` and the
      brand mark `src/components/google-logo.tsx`
- [ ] `pnpm exec lhci autorun` / CI `lighthouse` job green
