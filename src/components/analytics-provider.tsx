"use client";

import { useEffect } from "react";

// Read `NEXT_PUBLIC_POSTHOG_KEY` directly via `process.env` (inlined by
// Next.js/webpack at build time) instead of importing `src/lib/env.ts`.
// `env.ts` validates the FULL server schema (AUTH_SECRET, DATABASE_URL,
// SENTRY_DSN, ...) — importing that module from a client component would
// ship its zod schema (and every server env key name) into the browser
// bundle for the sake of one public key. Raw `process.env.NEXT_PUBLIC_*`
// access is the standard Next.js client-side pattern for exactly this
// reason, and it's the only thing Next.js statically inlines for
// client code in the first place.
const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;

/**
 * PostHog analytics slot — OFF by default.
 *
 * With no `NEXT_PUBLIC_POSTHOG_KEY` set, this renders `children` only:
 * no `posthog-js` import ever executes, so no PostHog code runs and no
 * network calls are made. Buyers turn it on by setting the env var.
 *
 * The `posthog-js` import is dynamic (inside `useEffect`, behind the key
 * check) rather than a static top-level import specifically so bundlers
 * split it into its own async chunk that is only *requested* when a key
 * is present — a static import would still ship the library in the
 * initial bundle regardless of the runtime `if` guard. Verified in
 * task-8-report.md by inspecting `.next` build output with and without
 * the key set.
 */
export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!POSTHOG_KEY) {
      return;
    }

    let cancelled = false;

    import("posthog-js").then(({ default: posthog }) => {
      if (cancelled) {
        return;
      }

      // Minimal init: posthog-js defaults to capturing pageviews (incl.
      // client-side route changes) out of the box — nothing extra to wire.
      posthog.init(POSTHOG_KEY, {
        api_host: "https://us.i.posthog.com",
        person_profiles: "identified_only",
      });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return <>{children}</>;
}
