// Sentry browser SDK — Next.js `instrumentation-client.ts` convention
// (auto-loaded before hydration, no wiring needed beyond this file's
// existence): https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup
//
// Deliberately a SEPARATE switch from the server-side `SENTRY_DSN`
// (src/lib/env.ts, used by sentry.server.config.ts / sentry.edge.config.ts):
// Next.js only ever inlines `NEXT_PUBLIC_`-prefixed vars into client
// bundles, so a non-prefixed `SENTRY_DSN` is simply unreadable here. Sentry
// DSNs are not secrets (they can only submit events, not read data), so
// mirroring one into a `NEXT_PUBLIC_SENTRY_DSN` var is safe if/when a buyer
// wants browser-side error capture too. Read raw via `process.env` rather
// than through `src/lib/env.ts` for the same reason documented in
// `analytics-provider.tsx` — this file is unset (disabled) by default.
// Note: NEXT_PUBLIC_SENTRY_DSN is also registered and validated in @/lib/env for consistency.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  // Dynamic import keeps `@sentry/nextjs`'s browser runtime out of the
  // work done on every page load when no DSN is configured — the file
  // itself is still part of the client entry (Next.js always loads
  // `instrumentation-client.ts`), but with no DSN nothing beyond this
  // `if` check ever executes.
  import("@sentry/nextjs").then((Sentry) => {
    Sentry.init({ dsn, enabled: true });
  });
}
