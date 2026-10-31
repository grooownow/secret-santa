---
name: observability
description: Error tracking (Sentry via @sentry/nextjs) — server/edge/client instrumentation, no-op until a DSN is set.
depends-on: []
presets: [App, App+Billing]
---

# observability

Adds Sentry error tracking to an App project. Depends on nothing. Ships the
Next.js instrumentation files (`instrumentation.ts` + `register()`, the server
and edge Sentry configs, and the client SDK) plus the `@sentry/nextjs`
dependency. Every entry point is a true no-op until a DSN is set, so a project
installs this without lighting up any network traffic by default.

## Apply plan

> Install the `observability` module into this project. Work on a branch
> (`feat/add-observability`) and commit once at the end.
>
> 1. **Mechanical apply.** Run `pnpm module:apply observability`. This copies
>    `modules/observability/files/**` into place — `src/instrumentation.ts`,
>    `src/instrumentation-client.ts`, `src/instrumentation.test.ts`,
>    `src/sentry.server.config.ts`, `src/sentry.edge.config.ts` — and adds
>    `@sentry/nextjs` to `package.json` `dependencies`. Nothing is spliced and
>    no shared file is overwritten: this module touches only its own 5 files
>    plus the one dependency. Run `pnpm install`.
> 2. **Env.** No env changes are needed. The Sentry vars `SENTRY_DSN` and
>    `NEXT_PUBLIC_SENTRY_DSN` are already registered (both `.optional()`) in
>    `src/lib/env.ts` — they carry over from Landing/persistence and stay
>    unset (Sentry disabled) by default. Set `SENTRY_DSN` (and optionally
>    `NEXT_PUBLIC_SENTRY_DSN` for browser capture) when you want live tracking.
> 3. **Wiring (judgment).** `next.config.ts` is deliberately NOT wrapped in
>    `withSentryConfig` (source-map upload / auto-instrumentation are out of
>    scope for this slot). Request-error capture works via the native Next.js
>    `onRequestError` hook in `src/instrumentation.ts`; nothing imports the
>    instrumentation files — Next auto-loads them. Leave `next.config.ts` as is.
> 4. **Verify.** `pnpm lint && pnpm test` — `instrumentation.test.ts` runs.
> 5. Commit as `feat(observability): add Sentry error tracking`.
