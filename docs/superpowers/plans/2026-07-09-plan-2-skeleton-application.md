# Liftkit Plan 2: Skeleton Application Layer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the Plan-1 foundation into a spec-complete skeleton app: auth with local-JWT sessions, error/logging/security baseline, design tokens + dark mode, analytics slot, SEO minimum, and the full three-level test harness with perf gates.

**Architecture:** Everything stays in the single Next.js codebase. Auth.js (next-auth v5) with JWT session strategy — middleware does only a cheap local cookie check, full validation lives in the data-access layer (spec §5.6-2). Errors surface via App Router error files; pino logs server-side; Sentry/PostHog are env-gated slots. Tests split into three vitest projects (unit-node, component-jsdom, integration-PGlite) plus Playwright e2e; Lighthouse CI enforces the §5.6 perf budget.

**Tech Stack additions:** next-auth@5 (Auth.js) + @auth/drizzle-adapter · shadcn/ui + next-themes · pino · @sentry/nextjs (disabled without DSN) · posthog-js (env-gated) · @testing-library/react + jsdom · Playwright · @lhci/cli.

**Spec coverage:** §5.1 (auth, tokens/shadcn, analytics slot), §5.4 (test harness levels 1–3), §5.6 (rules 1–5 + gates), §5.8 (errors, logger, Sentry slot, zod inputs, typed env, headers, rate limit, audit, SEO, a11y, dark mode). Docs-rules content (§5.9) → Plan 3.

**Repo note:** Work in `/Users/ekaterinapustovaa/Documents/Pet-projects/liftkit`, branch `feat/plan-2-application` off `main`. Internal docs (`docs/superpowers/`, `docs/marketing/`) untouched.

## Global Constraints

- Everything in the repo is **English**; conventional commits; pnpm only; Node >= 22.
- `pnpm lint` AND `pnpm test` green at every commit; `pnpm build` green at every task end.
- Install latest stable (`@latest`); adapt plan code to installed APIs when they differ, document the adaptation in the task report. Plan code blocks are the **semantic end state**.
- No `console.*` in `src/` (logger only); no secrets in code or commits.
- Never edit an applied DB migration — generate new ones.
- §5.6 invariants are law: no internal `<a>`, no network auth calls in middleware, optimistic UI for mutations, skeletons not spinners, server components by default.

---

### Task 1: Debt cleanup from Plan 1 final review

**Files:**
- Modify: `src/lib/env.ts` (zod v4 APIs), `scripts/seed.ts` (explicit catch), `.github/workflows/ci.yml` (checkout@v7), `src/db/client.ts` (lazy singleton)
- Test: existing tests must stay green; extend `src/db/client.test.ts`

**Interfaces:**
- Produces: `getDb()` lazy accessor replacing eager `db` export — signature `getDb(): ReturnType<typeof createDb>`; all future app code imports `getDb` (never instantiates at module load).

- [ ] **Step 1: zod modernization** — in `src/lib/env.ts`: `z.string().url()` → `z.url()`; `code: z.ZodIssueCode.custom` → `code: "custom"`. Run `pnpm test` — 7/7 green.
- [ ] **Step 2: seed catch** — `scripts/seed.ts`: replace `main().then(() => process.exit(0));` with:

```ts
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });
```

- [ ] **Step 3: checkout v7** — bump `actions/checkout@v6` → `@v7` in all three CI jobs; `actionlint` clean.
- [ ] **Step 4: lazy db (failing test first)** — add to `src/db/client.test.ts`:

```ts
it("does not create a data directory on mere import", async () => {
  // getDb must be lazy: importing the module has no side effects
  const fs = await import("node:fs");
  expect(fs.existsSync(".pglite-import-probe")).toBe(false);
});
```

Then rework `src/db/client.ts`:

```ts
let instance: ReturnType<typeof createDb> | undefined;

export function getDb(): ReturnType<typeof createDb> {
  instance ??= createDb(env);
  return instance;
}
```

Remove `export const db`; update `scripts/seed.ts` to `getDb()`. Run `pnpm test && pnpm lint`.
- [ ] **Step 5: verify + commit** — `pnpm build && pnpm db:reset` green.

```bash
git add -A && git commit -m "chore: modernize zod APIs, explicit seed failure, lazy db accessor, checkout v7"
```

---

### Task 2: Design tokens, shadcn/ui, dark mode

**Files:**
- Create: `components.json`, `src/components/ui/*` (shadcn button, card), `src/components/theme-provider.tsx`, `src/components/theme-toggle.tsx`
- Modify: `src/app/globals.css` (token variables, dark variant), `src/app/layout.tsx`, `src/app/page.tsx`

**Interfaces:**
- Produces: CSS custom-property tokens (`--background`, `--foreground`, `--primary`, …) as the single styling source; `<ThemeProvider>` wrapping the app; shadcn `Button`, `Card` in `src/components/ui/`.

- [ ] **Step 1: shadcn init** — `pnpm dlx shadcn@latest init` (style: default; base color: neutral; CSS variables: yes). Verify `components.json` and token variables in `globals.css` (both `:root` and `.dark`).
- [ ] **Step 2: add components** — `pnpm dlx shadcn@latest add button card`. They land in `src/components/ui/`.
- [ ] **Step 3: dark mode** — `pnpm add next-themes`. `src/components/theme-provider.tsx`:

```tsx
"use client";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  );
}
```

Wrap `{children}` in layout with `<ThemeProvider>`; add `suppressHydrationWarning` to `<html>`. Create `theme-toggle.tsx` (client component using `useTheme`, shadcn Button, sun/moon from `lucide-react` — `pnpm add lucide-react`).
- [ ] **Step 4: rework home page** — `src/app/page.tsx` becomes a token-styled server component: Card with the Liftkit headline, `/liftoff` hint, and the ThemeToggle in a corner. NO raw color classes (`bg-white`, `text-black` forbidden) — only token-backed classes (`bg-background`, `text-foreground`, `text-muted-foreground`, etc.).
- [ ] **Step 5: verify** — `pnpm dev`: page renders, toggle switches themes without flash, both themes readable. `pnpm lint && pnpm test && pnpm build` green.
- [ ] **Step 6: commit** — `feat: design tokens, shadcn/ui base components, dark mode`

---

### Task 3: Error surfaces + structured logger

**Files:**
- Create: `src/app/error.tsx`, `src/app/global-error.tsx`, `src/app/not-found.tsx`, `src/lib/logger.ts`, `src/lib/logger.test.ts`

**Interfaces:**
- Produces: `logger` (pino instance, server-only) with `logger.info/warn/error`; friendly error pages using tokens.

- [ ] **Step 1: logger (failing test first)** — `pnpm add pino`. Test:

```ts
import { describe, expect, it } from "vitest";
import { logger } from "./logger";

describe("logger", () => {
  it("exposes structured levels", () => {
    expect(typeof logger.info).toBe("function");
    expect(typeof logger.error).toBe("function");
  });
  it("is bound to the app service name", () => {
    expect(logger.bindings().service).toBe("liftkit");
  });
});
```

Implement `src/lib/logger.ts`:

```ts
import "server-only";
import pino from "pino";

export const logger = pino({
  base: { service: "liftkit" },
  level: process.env.LOG_LEVEL ?? "info",
});
```

`pnpm add server-only`. Note: the test runs in node env — if `server-only` throws outside React server context, mock or use the documented pattern (`vi.mock("server-only", () => ({}))` in vitest setup) and record it.
- [ ] **Step 2: error pages** — all three files, token-styled, friendly copy, no stack traces. `error.tsx` (client component, `reset()` button "Try again", logs via console? NO — client side cannot use pino/server logger; report via `console.error` is forbidden by lint → use the documented pattern: error.tsx receives `error` prop and displays digest only; server side already logged it). `not-found.tsx`: "Page not found" + Link home. `global-error.tsx` includes own `<html><body>`.
- [ ] **Step 3: verify** — temp route throwing an error renders error.tsx in dev; `/nonexistent` renders not-found. Remove temp route. Gates green.
- [ ] **Step 4: commit** — `feat: error surfaces and structured pino logger`

---

### Task 4: Extended typed env, security headers, rate-limit helper

**Files:**
- Modify: `src/lib/env.ts`, `.env.example`, `next.config.ts`
- Create: `src/lib/rate-limit.ts`, `src/lib/rate-limit.test.ts`

**Interfaces:**
- Produces: extended `Env` (adds `AUTH_SECRET?`, `AUTH_GITHUB_ID?`, `AUTH_GITHUB_SECRET?`, `SENTRY_DSN?`, `NEXT_PUBLIC_POSTHOG_KEY?`, `LOG_LEVEL?`); `rateLimit(key: string, opts?: { limit?: number; windowMs?: number }): { allowed: boolean; remaining: number }` (in-memory sliding window).

- [ ] **Step 1: extend env schema (tests first)** — new cases: defaults are all optional (skeleton boots with zero config); document each var in `.env.example` with a comment line.
- [ ] **Step 2: security headers** — `next.config.ts` `headers()`: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`. (Full CSP intentionally deferred — noted in config comment; agents adding inline scripts break naive CSP.)
- [ ] **Step 3: rate limiter (TDD)** — sliding-window counter on a Map, tests cover: allows under limit, blocks over limit, window expiry (use `vi.useFakeTimers()`), per-key isolation. Comment in file: per-instance memory — for multi-instance prod use a store-backed limiter (deploy playbook).
- [ ] **Step 4: verify headers live** — `pnpm dev` + `curl -sI localhost:3000 | grep -i x-content` shows the header. Gates green.
- [ ] **Step 5: commit** — `feat: extended typed env, security headers baseline, rate-limit helper`

---

### Task 5: Auth — schema, Auth.js config, JWT sessions

**Files:**
- Modify: `src/db/schema.ts` (accounts table per @auth/drizzle-adapter), generate migration
- Create: `src/lib/auth.ts`, `src/lib/auth.config.ts`, `src/app/api/auth/[...nextauth]/route.ts`, `src/lib/auth.test.ts`

**Interfaces:**
- Produces: `auth()` (session accessor for server components/actions), `signIn`/`signOut`, `handlers`; session strategy `"jwt"` — NO database session lookups; `authConfig.callbacks.authorized` pure function testable in isolation.

- [ ] **Step 1: install** — `pnpm add next-auth@latest @auth/drizzle-adapter`.
- [ ] **Step 2: schema** — add `accounts` table exactly per @auth/drizzle-adapter's Drizzle schema docs (provider, providerAccountId, userId FK → users.id, token fields); users table gains `emailVerified: timestamp`, `image: text` if the adapter requires. `pnpm db:generate` → new migration (never edit 0000). `pnpm db:migrate` + client.test still green (migrator picks up both).
- [ ] **Step 3: config split** — `auth.config.ts`: providers GitHub (+ Google if trivially similar), `session: { strategy: "jwt" }`, `callbacks.authorized({ auth })` returns `!!auth?.user` for paths starting `/dashboard`, true otherwise — PURE, no imports of db/node APIs (middleware-safe). `auth.ts`: `NextAuth({ ...authConfig, adapter: DrizzleAdapter(getDb(), {...}) })` exporting `{ handlers, auth, signIn, signOut }`. Route handler re-exports `handlers`.
- [ ] **Step 4: unit test the authorized callback** — table-driven: unauthenticated`/dashboard` → false; authenticated → true; `/` unauthenticated → true.
- [ ] **Step 5: graceful no-config** — with no AUTH_GITHUB_ID set, the app must still build and render public pages (providers array conditionally empty; sign-in page shows "No auth providers configured — see .env.example"). Verify `pnpm build` with clean `.env`.
- [ ] **Step 6: commit** — `feat: Auth.js with JWT sessions and Drizzle adapter`

---

### Task 6: Auth — middleware, pages, data-access guard

**Files:**
- Create: `src/middleware.ts`, `src/features/auth/index.ts`, `src/features/auth/sign-in-page.tsx`, `src/features/auth/require-user.ts`, `src/features/auth/require-user.test.ts`, `src/app/signin/page.tsx`, `src/app/dashboard/page.tsx`, `src/app/dashboard/loading.tsx`

**Interfaces:**
- Consumes: `auth`, `signIn`, `authConfig` from Task 5.
- Produces: `requireUser(): Promise<SessionUser>` (throws redirect to /signin when absent) — THE guard all future protected data access uses; auth feature slice with public index.

- [ ] **Step 1: middleware** — `src/middleware.ts` uses ONLY `auth.config.ts` (`NextAuth(authConfig).auth` edge pattern): optimistic cookie check, zero network/db. Matcher: `["/dashboard/:path*"]`. Comment block: THE ANTI-PATTERN WARNING (no `getUser()`-style network calls here — spec §5.6-2).
- [ ] **Step 2: requireUser (TDD)** — in the auth feature slice; calls `auth()`, redirects to `/signin` when no user (mock `next/navigation` redirect in test). Protected pages/actions call `requireUser()` — defense in depth beyond middleware.
- [ ] **Step 3: pages** — `/signin`: server component, provider buttons via server actions `signIn("github")`, token-styled, handles no-providers state. `/dashboard`: server component calling `requireUser()`, greets `user.email`, has `loading.tsx` skeleton (spec §5.6-4).
- [ ] **Step 4: verify flows** — dev: `/dashboard` unauthenticated → redirected to signin (middleware, no full reload path assertion here — e2e covers). Build green with and without auth env vars.
- [ ] **Step 5: commit** — `feat: auth middleware, sign-in and dashboard pages, requireUser guard`

---

### Task 7: Validated server-action pattern (the exemplar)

**Files:**
- Create: `src/features/profile/index.ts`, `src/features/profile/update-name-action.ts`, `src/features/profile/update-name-action.test.ts`, `src/features/profile/profile-form.tsx`
- Modify: `src/app/dashboard/page.tsx` (embed form)

**Interfaces:**
- Produces: the copy-me pattern every generated feature follows: zod schema at the boundary → `requireUser()` → db write via `getDb()` → `revalidatePath` → typed result `{ ok: true } | { ok: false; error: string }`; client form uses `useActionState` + optimistic name display.

- [ ] **Step 1: action (TDD, integration-style on PGlite)** — test: invalid input (empty name) → `{ ok: false }` without db write; valid input as authed user → users.name updated. Mock `requireUser` to return a seeded user.
- [ ] **Step 2: implement action** — `"use server"`; zod `nameSchema = z.object({ name: z.string().trim().min(1).max(80) })`; `safeParse` → early return with error; update via drizzle `.update(users).set({ name }).where(eq(users.id, user.id))`; `revalidatePath("/dashboard")`.
- [ ] **Step 3: form** — client component: `useActionState`, optimistic display of the new name while pending (spec §5.6-3), inline error text, shadcn Button/Input (`pnpm dlx shadcn@latest add input label`).
- [ ] **Step 4: verify in browser** — rename works instantly (optimistic), persists after reload. Gates green.
- [ ] **Step 5: commit** — `feat: validated server-action exemplar with optimistic profile form`

---

### Task 8: Analytics slot (PostHog) + Sentry slot

**Files:**
- Create: `src/components/analytics-provider.tsx`, Sentry config files per @sentry/nextjs wizard (`sentry.client.config.ts`, `sentry.server.config.ts`, `instrumentation.ts` — installed version's documented layout)
- Modify: `src/app/layout.tsx`, `.env.example`, `next.config.ts` (Sentry wrapper, tunnel off)

**Interfaces:**
- Produces: both slots OFF by default (no env → zero network calls, zero bundle bloat where achievable); `NEXT_PUBLIC_POSTHOG_KEY` / `SENTRY_DSN` switch them on. Decision recorded: **PostHog** (product events beat pageview-only Plausible for SaaS iteration; free tier generous).

- [ ] **Step 1: PostHog** — `pnpm add posthog-js`; provider client component initializes ONLY if key present; dynamic import so the lib stays out of the bundle when disabled; wrap layout.
- [ ] **Step 2: Sentry** — `pnpm add @sentry/nextjs`; configs guard on `SENTRY_DSN` (`enabled: Boolean(process.env.SENTRY_DSN)`); no source-map upload config (buyer adds token later — comment pointing to deploy playbook).
- [ ] **Step 3: verify OFF state** — clean `.env`: `pnpm build` green; dev network tab: zero posthog/sentry requests. Verify ON state for PostHog with a dummy key: init call visible (may 401 — fine, we only assert the slot fires).
- [ ] **Step 4: commit** — `feat: env-gated PostHog and Sentry slots, off by default`

---

### Task 9: SEO minimum

**Files:**
- Create: `src/app/sitemap.ts`, `src/app/robots.ts`, `src/app/opengraph-image.tsx`
- Modify: `src/app/layout.tsx` (metadata: template title, description, metadataBase from env), `src/lib/env.ts` (+ `NEXT_PUBLIC_APP_URL` with default `http://localhost:3000`)

- [ ] **Step 1: metadata** — layout: `title: { default: "Liftkit", template: "%s · Liftkit" }`, description, `metadataBase: new URL(env.NEXT_PUBLIC_APP_URL)`. Dashboard page exports its own `metadata.title`.
- [ ] **Step 2: sitemap + robots** — `sitemap.ts` lists `/` (dashboard is authed — excluded); `robots.ts` allows all, disallows `/dashboard`, points to sitemap.
- [ ] **Step 3: OG image** — `opengraph-image.tsx` via `next/og` ImageResponse: dark background, "Liftkit" wordmark, tagline — a TEMPLATE the /liftoff agent later rebrands (comment says so).
- [ ] **Step 4: verify** — `curl localhost:3000/sitemap.xml`, `/robots.txt`, `/opengraph-image` all 200. Build green.
- [ ] **Step 5: commit** — `feat: SEO baseline — metadata, sitemap, robots, OG template`

---

### Task 10: Component-test project (jsdom + Testing Library)

**Files:**
- Modify: `vitest.config.ts` → projects: `unit` (node, `src/**/*.test.ts`) and `component` (jsdom, `src/**/*.test.tsx`, setup file)
- Create: `vitest.setup.ts` (jest-dom matchers, server-only mock), `src/features/profile/profile-form.test.tsx`

**Interfaces:**
- Produces: `pnpm test` runs both projects; `.test.tsx` = component test convention (documented in Plan 3's testing rules).

- [ ] **Step 1: install** — `pnpm add -D @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom @vitejs/plugin-react`.
- [ ] **Step 2: config** — vitest `projects` (installed version's syntax; workspace file if required); component project: jsdom env, react plugin, setup imports `@testing-library/jest-dom/vitest`.
- [ ] **Step 3: sample test (TDD spirit — write against real component)** — profile-form: renders current name; submitting empty shows validation error; typing + submit calls action (mock the server action module) and shows optimistic value.
- [ ] **Step 4: verify** — `pnpm test`: all projects green (unit 8+, component 3+). Lint green (testing-library imports pass boundaries: test files exempt? if boundaries flags test files, scope `boundaries/include` to exclude `**/*.test.*` and document).
- [ ] **Step 5: commit** — `test: jsdom component-test project with Testing Library`

---

### Task 11: API integration-test project

**Files:**
- Modify: `vitest.config.ts` (third project `integration`, `tests/integration/**/*.test.ts`, node env, singleThread)
- Create: `tests/integration/helpers/test-db.ts`, `tests/integration/auth-route.test.ts`, `tests/integration/profile-action.test.ts` (move/extend Task 7's db-backed test here)

**Interfaces:**
- Produces: `createTestDb(): Promise<{ db; cleanup }>` — fresh in-memory PGlite with migrations applied, per test file; integration convention: real db, mocked session.

- [ ] **Step 1: helper** — in-memory PGlite + `migrate()` (pattern from `src/db/client.test.ts`), plus `vi.mock("@/db/client")` injection helper so code under test hits the test db through `getDb()`.
- [ ] **Step 2: move db-backed action test** — Task 7's test relocates to `tests/integration/`; `src/**` keeps pure unit/component tests only (convention).
- [ ] **Step 3: auth route smoke** — GET `/api/auth/providers` handler returns JSON (call the exported handler directly with a Request).
- [ ] **Step 4: verify** — `pnpm test` all three projects green; CI quality job already runs `pnpm test` — now covers integration on PGlite; remote-db CI job unchanged (schema tests only).
- [ ] **Step 5: commit** — `test: integration project — real PGlite db, direct handler and action tests`

---

### Task 12: Playwright e2e + CI job

**Files:**
- Create: `playwright.config.ts`, `tests/e2e/smoke.spec.ts`
- Modify: `package.json` (`test:e2e`), `.github/workflows/ci.yml` (e2e job), `.gitignore` (test artifacts)

**Interfaces:**
- Produces: `pnpm test:e2e`; projects `desktop-chromium` (1280×720) and `mobile-chromium` (Pixel 7 viewport); `webServer` = `pnpm build && pnpm start` with fresh db.

- [ ] **Step 1: install** — `pnpm add -D @playwright/test`; `pnpm exec playwright install chromium`.
- [ ] **Step 2: config** — webServer command `pnpm db:reset && pnpm build && pnpm start`, port 3000, `reuseExistingServer: !process.env.CI`; two projects; trace on-first-retry.
- [ ] **Step 3: smoke specs** — (1) home renders headline + theme toggle works (click → `html.class` contains `dark`); (2) `/dashboard` unauthenticated redirects to `/signin` and shows provider state; (3) 404 page for `/nonexistent`; (4) **§5.6-1 gate:** navigation `/` → signin link is client-side — assert via `page.on("framenavigated")` absence of full reload (use `page.evaluate(() => performance.getEntriesByType("navigation").length)` staying 1 after Link click).
- [ ] **Step 4: CI job** — `e2e`: pnpm setup → install chromium with deps → `pnpm test:e2e`; artifacts upload on failure.
- [ ] **Step 5: verify locally** — `pnpm test:e2e` green on both projects. Commit: `test: Playwright e2e smoke with SPA-navigation gate + CI job`

---

### Task 13: Lighthouse CI + audit gate + DoD run

**Files:**
- Create: `lighthouserc.json`
- Modify: `.github/workflows/ci.yml` (lighthouse job, `pnpm audit --audit-level high` step in quality job), `README.md` (gates section)

- [ ] **Step 1: LHCI config** — `pnpm add -D @lhci/cli`; `lighthouserc.json`: collect against started prod server (`startServerCommand": "pnpm start"` after build; url `/` and `/signin`), assert `categories:performance >= 0.9`, `categories:accessibility >= 0.9`; upload: filesystem (no LHCI server).
- [ ] **Step 2: CI wiring** — lighthouse job: build once, run `lhci autorun`; quality job gains `pnpm audit --audit-level high || true`? NO — spec says red on high: plain `pnpm audit --audit-level high` (document the escape hatch: pnpm overrides for false positives).
- [ ] **Step 3: local verification** — `pnpm build && pnpm dlx @lhci/cli autorun` (or via devDep) passes both budgets locally.
- [ ] **Step 4: README** — add "Quality gates" section: lint chain, three test levels, e2e, Lighthouse budgets, audit.
- [ ] **Step 5: full DoD run** — `pnpm lint && pnpm test && pnpm test:e2e && pnpm build && rm -rf .pglite .env && ./scripts/bootstrap --ci && pnpm build`. All green.
- [ ] **Step 6: commit** — `ci: Lighthouse perf/a11y budgets and dependency audit gate`

---

## Plan 2 Definition of Done

- Zero-config boot: clean clone + bootstrap → public pages work, auth shows "not configured" gracefully, no analytics/error-tracking network calls.
- With GitHub OAuth env: sign in → `/dashboard` → rename with optimistic form → sign out.
- Middleware performs no network/db calls (code-inspectable + comment-guarded).
- `pnpm test` = unit + component + integration (PGlite); `pnpm test:e2e` = desktop+mobile smoke incl. SPA-navigation assertion; Lighthouse ≥ 0.9 perf and a11y on `/` and `/signin`; `pnpm audit` high = red.
- Both themes render correctly; all styles token-backed.
- All §5.6 rules and §5.8 items in this plan's scope demonstrably enforced by a gate, not prose.
