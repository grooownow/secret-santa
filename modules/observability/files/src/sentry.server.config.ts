// Sentry Node.js SDK — server-runtime config, loaded from
// `src/instrumentation.ts`'s `register()` per the documented manual-setup
// convention for `@sentry/nextjs` (no install wizard):
// https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup
//
// `enabled: Boolean(env.SENTRY_DSN)` keeps this a true no-op — no init,
// no background transport, no network calls — when the DSN is unset,
// which is this slot's default state.
import * as Sentry from "@sentry/nextjs";
import { env } from "@/lib/env";

Sentry.init({
  dsn: env.SENTRY_DSN,
  enabled: Boolean(env.SENTRY_DSN),
});
