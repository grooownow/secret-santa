// Sentry Edge SDK — edge-runtime config (middleware, edge route handlers),
// loaded from `src/instrumentation.ts`'s `register()`. See
// sentry.server.config.ts for the shared rationale; kept as a separate
// file because Next.js's manual-setup convention loads server vs. edge
// config from distinct entry points based on `NEXT_RUNTIME`.
import * as Sentry from "@sentry/nextjs";
import { env } from "@/lib/env";

Sentry.init({
  dsn: env.SENTRY_DSN,
  enabled: Boolean(env.SENTRY_DSN),
});
