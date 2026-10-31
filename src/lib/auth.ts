import { DrizzleAdapter } from "@auth/drizzle-adapter";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { eq } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { z } from "zod";
import { getDb } from "@/db/client";
import { accounts, users } from "@/db/schema";
import { verifyPassword } from "@/lib/password";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "./client-ip";
import { authConfig } from "./auth.config";

export { clientIp } from "./client-ip";
import {
  currentSessionVersion,
  onGoogleUserCreated,
  signInPolicy,
  syncLocaleCookie,
} from "./auth-events";

// `getDb()` returns a union (`PgliteDatabase | PostgresJsDatabase`, picked at
// runtime by `GRIDFIN_DB`) rather than a single concrete Drizzle db type.
// `DrizzleAdapter`'s generic infers from one concrete `SqlFlavorOptions`
// member and doesn't distribute over that union, so TypeScript can't match
// it structurally. Both members are `postgres`-dialect Drizzle databases, so
// this narrow cast to the adapter's own (unexported) `AnyPostgresDatabase`
// shape is sound — it's exactly the type `DrizzleAdapter` accepts for
// Postgres. `any` here mirrors that library type verbatim.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPostgresDatabase = PgDatabase<PgQueryResultHKT, any>;

// Emails are stored lowercase (see scripts/seed.ts), and browsers and password
// managers routinely capitalise the first letter. Normalise before the lookup
// so `Admin@x.dev` finds `admin@x.dev`. Normalising here — not only in the
// sign-in action — also covers a direct POST to /api/auth/callback/credentials.
const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(1),
});

// A real bcrypt hash of a throwaway string. When the email is unknown or the
// account has no password (Google-only), `verifyPassword` still runs against
// it, so the response time does not reveal whether the email is registered.
export const DUMMY_PASSWORD_HASH =
  "$2b$10$m6UgXLGHVKv01jMnCqiLP.ZVIRkABs.qoS2akA4s4yarioBB8sXfC";

const EMAIL_ATTEMPTS_PER_MINUTE = 10;
const IP_ATTEMPTS_PER_MINUTE = 30;

/**
 * Credentials authorize logic, exported for unit testing. Returns the user
 * (id/email/name) on a correct email+password, or null otherwise. Lives in
 * auth.ts (Node-only) — it touches the db and bcrypt, which must never be
 * pulled into the edge-safe auth.config.ts / middleware.
 *
 * Throttling is here, not in the sign-in server action, so a direct POST to
 * /api/auth/callback/credentials is limited too: per normalised email and
 * per client IP.
 */
export async function authorizeCredentials(
  raw: unknown,
  request?: Request,
): Promise<{ id: string; email: string; name: string | null } | null> {
  const parsed = credentialsSchema.safeParse(raw);
  if (!parsed.success) return null;

  const byEmail = rateLimit(`signin:email:${parsed.data.email}`, {
    limit: EMAIL_ATTEMPTS_PER_MINUTE,
    windowMs: 60_000,
  });
  const ip = clientIp(request);
  const byIp = ip
    ? rateLimit(`signin:ip:${ip}`, {
        limit: IP_ATTEMPTS_PER_MINUTE,
        windowMs: 60_000,
      })
    : { allowed: true };
  if (!byEmail.allowed || !byIp.allowed) return null;

  const rows = await getDb()
    .select()
    .from(users)
    .where(eq(users.email, parsed.data.email))
    .limit(1);

  const user = rows[0];
  const valid = await verifyPassword(
    parsed.data.password,
    user?.passwordHash ?? DUMMY_PASSWORD_HASH,
  );
  if (!user?.passwordHash || !valid) return null;
  return { id: user.id, email: user.email, name: user.name };
}

// Lazy config initializer (the `(request) => config` overload of
// `NextAuth()`), NOT a plain config object. `getDb()` opens the PGlite/
// postgres-js connection on first call, and this must not happen at module
// import time: `next build`'s prerender/static-page-data pass imports this
// module eagerly, and PGlite's WASM init doesn't play well with that
// environment (dumps `TypeError: The "path" argument must be of type
// string...` — six of them — into every build log). Wrapping the whole
// config in a callback defers `getDb()` (and adapter construction) to the
// first actual request, matching the lazy-db invariant used everywhere else
// (see src/db/client.ts's `getDb()` memoization).
export const { handlers, auth, signIn, signOut } = NextAuth(() => ({
  ...authConfig,
  providers: [
    ...authConfig.providers,
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: (raw, request) => authorizeCredentials(raw, request),
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    // Stamps the JWT with the account's session version at sign-in. It is read
    // here (Node, db) and not in the edge-safe auth.config.ts, so the
    // middleware stays database-free; requireAccount compares it later.
    async jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
        token.sv = await currentSessionVersion(user.id);
      }
      return token;
    },
    // Only Google and credentials may sign in (see signInPolicy).
    async signIn({ user, account, profile }) {
      return signInPolicy(
        account?.provider,
        user.email,
        typeof profile?.email_verified === "boolean"
          ? profile.email_verified
          : undefined,
      );
    },
  },
  events: {
    async signIn({ user }) {
      if (user.id) await syncLocaleCookie(user.id);
    },
    async createUser({ user }) {
      // Credentials accounts are inserted by our own register action; only
      // OAuth sign-ups come through the adapter.
      if (user.id) await onGoogleUserCreated(user.id);
    },
  },
  adapter: DrizzleAdapter(getDb() as AnyPostgresDatabase, {
    usersTable: users,
    accountsTable: accounts,
    // No sessionsTable/verificationTokensTable: JWT session strategy needs
    // no server-side session lookup, and magic-link email is out of scope
    // (see src/db/schema.ts).
  }),
}));
