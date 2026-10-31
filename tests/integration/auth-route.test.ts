import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

// Direct-handler smoke test for the Auth.js route (src/app/api/auth/[...nextauth]/route.ts),
// which just re-exports `handlers` from `next-auth`. No HTTP server involved —
// we call the exported `GET` handler directly with a request, the same shape
// Next.js's route runtime would hand it.
//
// Three adaptations were needed to make this importable/callable under vitest:
//
// 1. `next-auth`'s compiled output does `import ... from "next/server"`
//    (extensionless). Next.js's own package.json has no `exports` map, so
//    outside of Next's build pipeline that specifier doesn't resolve via
//    plain Node ESM resolution. vitest.config.ts's "integration" project
//    works around this with a `next/server` -> `next/server.js` alias, and
//    inlines `next-auth`/`next` via `server.deps.inline` so the alias is
//    actually applied (externalized deps skip Vite's resolver entirely).
// 2. `handlers.GET` is typed `(req: NextRequest) => Promise<Response>`, not
//    plain `Request` — construct a `NextRequest` (a `Request` subclass with
//    the same constructor signature) instead of `new Request(...)`.
// 3. Auth.js reads its `secret` from `AUTH_SECRET` at *request* time (inside
//    the `Auth()` call), not at module load, so it isn't picked up from
//    `.env` at import time in a test process — without it the handler
//    returns a 500 ("MissingSecret"). We set `process.env.AUTH_SECRET`
//    before calling `GET`.
describe("GET /api/auth/providers", () => {
  it("returns the provider map as JSON", async () => {
    process.env.AUTH_SECRET = "test-secret-at-least-32-characters-long";
    const { GET } = await import("@/app/api/auth/[...nextauth]/route");

    const res = await GET(
      new NextRequest("http://localhost/api/auth/providers"),
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/application\/json/);
    // No AUTH_GITHUB_ID/AUTH_GOOGLE_ID configured in the test env (see
    // src/lib/auth.config.ts's buildProviders), so the OAuth providers are
    // absent. Credentials (src/lib/auth.ts) is always present — it isn't
    // env-gated — so it's the only entry in the map.
    const body: unknown = await res.json();
    expect(body).toEqual({
      credentials: expect.objectContaining({
        id: "credentials",
        type: "credentials",
        name: "Credentials",
      }),
    });
  });
});
