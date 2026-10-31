import { type Instrumentation } from "next";

// Next.js instrumentation file (docs: "File Conventions > instrumentation.ts").
// `onRequestError` is called by Next's server for every uncaught error thrown
// during rendering/route handling *before* the client error boundary
// (src/app/error.tsx) takes over — this is what actually satisfies spec
// §5.8 "server errors always logged with context".
//
// The hook itself runs in every runtime (nodejs, edge), but our logger
// (src/lib/logger.ts) is pino, which is nodejs-only. We guard the pino
// branch on NEXT_RUNTIME per the documented pattern and no-op it on edge —
// Sentry's capture below is NOT skipped on edge, though, since Sentry
// supports that runtime and edge errors are worth capturing too.
//
// `register()` is Next's other instrumentation hook: it runs once per
// runtime at boot and is where the documented `@sentry/nextjs` manual setup
// (no install wizard) loads its per-runtime config. We deliberately don't
// wrap `next.config.ts` in `withSentryConfig` — that wrapper exists for
// source-map upload and auto-instrumenting API routes/middleware, neither
// of which this slot needs: `onRequestError` (a native Next.js hook, not a
// Sentry build-time transform) is enough to capture request errors here.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError: Instrumentation.onRequestError = async (
  err,
  request,
  context,
) => {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Imported lazily so the edge bundle never has to resolve pino/server-only.
    const { logger } = await import("@/lib/logger");

    logger.error(
      {
        err,
        path: request.path,
        method: request.method,
        routerKind: context.routerKind,
        routePath: context.routePath,
        routeType: context.routeType,
      },
      "request error",
    );
  }

  // Chain Sentry's own request-error capture alongside pino. Guarded on
  // SENTRY_DSN directly (rather than importing src/lib/env.ts) so this
  // stays a true no-op — no import, no network attempt — in the default
  // (DSN-unset) state, matching sentry.server.config.ts / edge.config.ts.
  if (process.env.SENTRY_DSN) {
    const Sentry = await import("@sentry/nextjs");
    Sentry.captureRequestError(err, request, context);
  }
};
