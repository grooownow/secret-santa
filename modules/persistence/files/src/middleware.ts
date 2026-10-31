import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

/**
 * ANTI-PATTERN WARNING (spec §5.6-2): do NOT import `@/lib/auth` here, and do
 * not add any network/db call to this file. `@/lib/auth` wires up
 * `DrizzleAdapter` (pulling in `@electric-sql/pglite`/`postgres`), which is
 * Node-only — bundling it into Middleware would either break the Edge
 * runtime or, worse, silently add a per-request database round trip to
 * every matched request (the classic "call a `getUser()`-style API in
 * middleware" latency trap).
 *
 * This file builds its own `NextAuth()` instance from the edge-safe
 * `authConfig` alone (no adapter), so `auth()` below only decodes the
 * JWT/cookie already present on the request and runs the pure, in-memory
 * `authorized()` callback (path-based only — see auth.config.ts). It is a
 * coarse, fast, optimistic gate. `requireUser()`
 * (src/features/auth/require-user.ts) is the real guard that hits the
 * database via the full `auth()`, and every protected server
 * component/action must call it directly — never rely on middleware alone
 * for authorization.
 */
const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  matcher: ["/dashboard/:path*"],
};
