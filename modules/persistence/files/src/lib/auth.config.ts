import type { NextAuthConfig } from "next-auth";
import type { Provider } from "next-auth/providers";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { env } from "@/lib/env";

/**
 * Edge-safe Auth.js config (no db/Node-only imports — this module must stay
 * importable from Next.js Middleware). The Drizzle adapter and any db-backed
 * setup live in `./auth.ts`, which spreads `authConfig` and adds `adapter`.
 */

export interface AuthProviderEnv {
  AUTH_GITHUB_ID?: string;
  AUTH_GITHUB_SECRET?: string;
  AUTH_GOOGLE_ID?: string;
  AUTH_GOOGLE_SECRET?: string;
}

/**
 * Builds the OAuth provider list from an env object passed as a parameter
 * (rather than read from `process.env` internally), so tests can exercise
 * every provider on/off combination without mutating global env state.
 */
export function buildProviders(providerEnv: AuthProviderEnv): Provider[] {
  const providers: Provider[] = [];

  if (providerEnv.AUTH_GITHUB_ID && providerEnv.AUTH_GITHUB_SECRET) {
    providers.push(
      GitHub({
        clientId: providerEnv.AUTH_GITHUB_ID,
        clientSecret: providerEnv.AUTH_GITHUB_SECRET,
      }),
    );
  }

  if (providerEnv.AUTH_GOOGLE_ID && providerEnv.AUTH_GOOGLE_SECRET) {
    providers.push(
      Google({
        clientId: providerEnv.AUTH_GOOGLE_ID,
        clientSecret: providerEnv.AUTH_GOOGLE_SECRET,
      }),
    );
  }

  return providers;
}

/** Ids of the providers configured for the given env, for the sign-in page. */
export function providerIdsFor(providerEnv: AuthProviderEnv): string[] {
  return buildProviders(providerEnv).map((provider) =>
    typeof provider === "function" ? provider({}).id : provider.id,
  );
}

/**
 * Builds the full Auth.js config from an env object. Exported (rather than
 * only exposing a singleton) so tests can vary the env per case; `authConfig`
 * below is the real singleton built from `@/lib/env`.
 */
export function buildAuthConfig(
  providerEnv: AuthProviderEnv,
  opts: { devBypass?: boolean } = {},
): NextAuthConfig {
  return {
    providers: buildProviders(providerEnv),
    session: { strategy: "jwt" },
    // Custom sign-in page: without this, next-auth's `authorized()`-driven
    // redirect (used by both src/middleware.ts and route protection) falls
    // back to `${basePath}/signin` (i.e. `/api/auth/signin`), not our
    // feature page at src/app/signin/page.tsx.
    pages: { signIn: "/signin" },
    callbacks: {
      // Path-based route protection, used by Middleware and route handlers.
      // Pure: only inspects the request path and whether a user is present.
      authorized({ auth, request }) {
        const { pathname } = request.nextUrl;
        if (pathname.startsWith("/dashboard")) {
          // Dev bypass: treat every request as authorized so local runs skip
          // sign-in. Guarded off in production by src/lib/env.ts.
          return opts.devBypass === true || !!auth?.user;
        }
        return true;
      },
      // Persist the user id onto the JWT on sign-in, and expose it on the
      // session so `session.user.id` is available everywhere (JWT strategy
      // has no server-side session lookup to enrich it from).
      jwt({ token, user }) {
        if (user) {
          token.id = user.id;
        }
        return token;
      },
      session({ session, token }) {
        if (session.user && typeof token.id === "string") {
          session.user.id = token.id;
        }
        return session;
      },
    },
  };
}

/** Ids of the providers configured for the running app, for the sign-in page. */
export const providerIds: string[] = providerIdsFor(env);

/** The real Auth.js config, built from process env via `@/lib/env`. */
export const authConfig: NextAuthConfig = buildAuthConfig(env, {
  devBypass: env.AUTH_DEV_BYPASS,
});
