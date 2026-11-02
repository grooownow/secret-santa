import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  typedRoutes: true,

  // Participant photos live in Vercel Blob (public store, *.public.blob.vercel-storage.com).
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },

  // PGlite ships a WASM binary and resolves its own assets through Node's
  // fs/URL APIs. Bundled into a server chunk it ends up with a second `URL`
  // realm, so Node rejects its own path argument at request time:
  // `ERR_INVALID_ARG_TYPE: ... must be ... an instance of URL. Received an
  // instance of URL`. Loading it via native `require` keeps one realm.
  // Reproduced by tests/e2e/auth.spec.ts: without this, a real credentials
  // sign-in (a Server Action) crashes in the production build.
  serverExternalPackages: ["@electric-sql/pglite"],

  // Next 16.4 started tracing sharp (+ its ~18 MB libvips binary) into every
  // page function. On Vercel /_next/image is served by the platform's image
  // optimizer, never by sharp inside our functions, so keep it out of the
  // bundles (the trace gate in scripts/check-function-traces.ts caught it).
  outputFileTracingExcludes: {
    "*": ["node_modules/sharp/**", "node_modules/@img/**"],
  },

  // Security headers baseline. A full Content-Security-Policy is
  // deliberately deferred: a naive CSP breaks agent-added inline scripts
  // in this skeleton. See docs/rules/security.md for the CSP
  // rollout plan.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

// Sentry error tracking moved into the observability module (App preset);
// next.config.ts is intentionally not wrapped in `withSentryConfig`.
export default withNextIntl(nextConfig);
