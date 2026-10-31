# Default Credentials Auth + Dev Bypass — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a template you can actually log into out of the box — email/password auth with a seeded admin, a dev bypass for zero-friction local runs, and an explicit auth-mode step in onboarding — without OAuth or a foreign identity provider.

**Architecture:** A nullable `passwordHash` column on `users`; a `Credentials` provider added ONLY in the Node-only `src/lib/auth.ts` (never the edge-safe `auth.config.ts`, which stays OAuth-only so `src/middleware.ts` keeps its no-db invariant). A `AUTH_DEV_BYPASS` env flag (default on) makes `requireUser()` return the seeded admin and `authorized()` allow `/dashboard`; `src/lib/env.ts` throws at startup if the flag is on under `NODE_ENV=production`. Seeded creds come from `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` env (dev defaults), hashed with `bcryptjs`; `scripts/seed.ts` refuses to run in production. The sign-in server action rate-limits before checking the hash. E2E runs with the bypass OFF so the real login is exercised every gate run.

**Tech Stack:** Auth.js (next-auth v5) Credentials provider + JWT strategy + DrizzleAdapter, `bcryptjs`, zod 4 (`z.stringbool()`), Drizzle/PGlite, Playwright, Vitest.

## Key integration risk (read before Task 4)

Auth.js Credentials provider works ONLY with the JWT session strategy — which
this repo already sets (`auth.config.ts` → `session: { strategy: "jwt" }`).
The `authorize()` callback returns a user object (id/email/name) or `null`; the
existing `jwt`/`session` callbacks already copy `user.id` onto the token and
session, so no session-callback change is needed. This wiring is verified by
Task 4's unit test (authorize accepts/rejects) and Task 7's e2e (real login →
dashboard). Do not switch the session strategy to "database".

## Global Constraints

- The `Credentials` provider and anything that imports `bcryptjs`, `getDb()`, or the password helpers live in `src/lib/auth.ts` or feature/server files — NEVER in `src/lib/auth.config.ts` or `src/middleware.ts` (edge-safe, no db/network — CLAUDE.md invariant 2, security.md Auth). (spec §4)
- Password hashing uses `bcryptjs` (pure JS, no native build). Not argon2. (spec §3)
- `AUTH_DEV_BYPASS` defaults to `true`; `src/lib/env.ts` throws at startup when it is truthy AND `NODE_ENV=production`. (spec §5)
- `scripts/seed.ts` refuses to run when `NODE_ENV=production` (throws with a clear message). Seeded creds come from env, never a hardcoded literal. (spec §6, security.md Secrets hygiene)
- Every new env var needs all three: schema entry in `src/lib/env.ts`, a documented line in `.env.example`, and a case in `src/lib/env.test.ts`. (security.md Typed environment)
- The sign-in server action validates input with zod and calls `rateLimit()` before checking the hash. (spec §8, security.md Validate every boundary + rate limiting)
- E2E server runs with `AUTH_DEV_BYPASS=false` so the real login is tested. (spec §7)
- No roles: do NOT add a `role` column or `requireAdmin()`. (spec §2)
- Repo artifacts English-only. Conventional Commits. `pnpm format` before every commit (lefthook pre-commit runs `prettier --check`). `no-console` is an error in product code (scripts/** exempt).
- Every feature ships a test proven able to fail — show RED before GREEN for each new test.

---

### Task 1: Env foundation — bypass flag + seed creds + production guard

**Files:**
- Modify: `src/lib/env.ts`
- Modify: `src/lib/env.test.ts`
- Modify: `.env.example`

**Interfaces:**
- Produces: `env.AUTH_DEV_BYPASS: boolean`, `env.SEED_ADMIN_EMAIL: string`, `env.SEED_ADMIN_PASSWORD: string`. Consumed by Tasks 3-7.

- [ ] **Step 1: Write failing env tests**

In `src/lib/env.test.ts` add:

```ts
  it("defaults AUTH_DEV_BYPASS to true in development", () => {
    const env = parseEnv({});
    expect(env.AUTH_DEV_BYPASS).toBe(true);
  });

  it("throws when AUTH_DEV_BYPASS is on under NODE_ENV=production", () => {
    expect(() =>
      parseEnv({ NODE_ENV: "production", AUTH_DEV_BYPASS: "true" }),
    ).toThrow(/AUTH_DEV_BYPASS/);
  });

  it("allows production when AUTH_DEV_BYPASS is explicitly false", () => {
    const env = parseEnv({ NODE_ENV: "production", AUTH_DEV_BYPASS: "false" });
    expect(env.AUTH_DEV_BYPASS).toBe(false);
  });

  it("provides dev defaults for the seed admin credentials", () => {
    const env = parseEnv({});
    expect(env.SEED_ADMIN_EMAIL).toBe("admin@example.local");
    expect(env.SEED_ADMIN_PASSWORD.length).toBeGreaterThanOrEqual(8);
  });
```

- [ ] **Step 2: Run — verify FAIL**

Run: `pnpm exec vitest run src/lib/env.test.ts`
Expected: FAIL — `AUTH_DEV_BYPASS`/`SEED_ADMIN_*` not on the schema yet.

- [ ] **Step 3: Add the schema fields**

In `src/lib/env.ts`, inside the `z.object({...})`, after the `AUTH_GOOGLE_SECRET` line add:

```ts
    // Auth dev bypass: when true, requireUser() returns the seeded admin and
    // middleware lets /dashboard through — zero-friction local runs. Guarded
    // below: it must NOT be truthy in production.
    AUTH_DEV_BYPASS: z.stringbool().default(true),

    // Seed admin credentials (dev defaults; overridden per project via .env).
    // scripts/seed.ts hashes the password and refuses to run in production.
    SEED_ADMIN_EMAIL: z.email().default("admin@example.local"),
    SEED_ADMIN_PASSWORD: z.string().min(8).default("dev-admin-pw"),
```

- [ ] **Step 4: Add the production guard**

In the existing `.superRefine((val, ctx) => { ... })`, after the `LIFTKIT_DB` check add:

```ts
    if (val.NODE_ENV === "production" && val.AUTH_DEV_BYPASS) {
      ctx.addIssue({
        code: "custom",
        path: ["AUTH_DEV_BYPASS"],
        message:
          "AUTH_DEV_BYPASS must be false (or unset to false) when NODE_ENV=production",
      });
    }
```

- [ ] **Step 5: Run — verify PASS**

Run: `pnpm exec vitest run src/lib/env.test.ts`
Expected: PASS — all new cases green, existing cases still green.

- [ ] **Step 6: Document in .env.example**

In `.env.example`, in the Auth section (after the `AUTH_GOOGLE_SECRET` line), add:

```
# --- Auth: local login (credentials) ---
# Dev bypass: when true, you are auto-logged-in as the seeded admin and
# /dashboard needs no sign-in — set to false to exercise the real login.
# MUST be false in production (the app refuses to boot otherwise).
# AUTH_DEV_BYPASS=true
# Seeded admin login (dev defaults shown; the sign-in page uses these).
# The seed hashes the password and refuses to run in production.
# SEED_ADMIN_EMAIL=admin@example.local
# SEED_ADMIN_PASSWORD=dev-admin-pw
```

- [ ] **Step 7: Commit**

```bash
pnpm format
git add src/lib/env.ts src/lib/env.test.ts .env.example
git commit -m "feat: env for auth dev bypass and seed admin credentials"
```

---

### Task 2: Password schema, hashing helper, bcryptjs dependency

**Files:**
- Modify: `package.json` (add `bcryptjs` + `@types/bcryptjs`)
- Modify: `src/db/schema.ts` (`users.passwordHash`)
- Create: migration under `src/db/migrations/` (generated)
- Create: `src/features/auth/password.ts` + `src/features/auth/password.test.ts`
- Modify: `src/features/auth/index.ts` (export the helpers if the barrel is used)

**Interfaces:**
- Produces: `hashPassword(plain: string): Promise<string>` and `verifyPassword(plain: string, hash: string): Promise<boolean>` from `src/features/auth/password.ts`; `users.passwordHash` column (nullable). Consumed by Tasks 3-4.

- [ ] **Step 1: Add the dependency**

Run:
```bash
pnpm add bcryptjs && pnpm add -D @types/bcryptjs
pnpm audit --audit-level high
```
Expected: installs cleanly; audit reports no high/critical advisory (if it does, stop and report — do NOT add an override without cause).

- [ ] **Step 2: Add the column**

In `src/db/schema.ts`, in the `users` table after `image: text("image"),` add:

```ts
  // Local (credentials) login. Nullable: OAuth-only users have no password.
  passwordHash: text("password_hash"),
```

- [ ] **Step 3: Generate and inspect the migration**

Run:
```bash
pnpm db:generate
ls src/db/migrations/
```
Read the newest `.sql` file — it must be a single `ALTER TABLE "users" ADD COLUMN "password_hash" text;` (nullable, no default). Do NOT edit prior migration files.

- [ ] **Step 4: Write failing password-helper tests**

Create `src/features/auth/password.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("verifies a correct password against its hash", async () => {
    const hash = await hashPassword("correct horse");
    expect(await verifyPassword("correct horse", hash)).toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("correct horse");
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });

  it("produces distinct hashes for the same input (salted)", async () => {
    expect(await hashPassword("same")).not.toBe(await hashPassword("same"));
  });
});
```

- [ ] **Step 5: Run — verify FAIL**

Run: `pnpm exec vitest run src/features/auth/password.test.ts`
Expected: FAIL — `./password` does not exist yet.

- [ ] **Step 6: Write the helper**

Create `src/features/auth/password.ts`:

```ts
import bcrypt from "bcryptjs";

// Cost factor 10 — the bcryptjs default; ample for a template, fast enough
// that the sign-in path stays responsive under the local dev server.
const SALT_ROUNDS = 10;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
```

- [ ] **Step 7: Export from the barrel (if present)**

If `src/features/auth/index.ts` re-exports feature helpers, add `export * from "./password";` following the file's existing style. If it only exports specific symbols, add `hashPassword`/`verifyPassword`. If there is no barrel export pattern, skip and note it.

- [ ] **Step 8: Run — verify PASS + migrate**

Run:
```bash
pnpm exec vitest run src/features/auth/password.test.ts
pnpm db:migrate
```
Expected: tests PASS; migration applies cleanly.

- [ ] **Step 9: Commit**

```bash
pnpm format
git add package.json pnpm-lock.yaml src/db/schema.ts src/db/migrations/ src/features/auth/password.ts src/features/auth/password.test.ts src/features/auth/index.ts
git commit -m "feat: password_hash column and bcryptjs hashing helper"
```

---

### Task 3: Seed the admin user (hashed, env-driven, prod-refusing)

**Files:**
- Modify: `scripts/seed.ts`
- Modify: `src/db/factories.ts` (allow `passwordHash` override — it already spreads overrides, confirm the type)

**Interfaces:**
- Consumes: `env.SEED_ADMIN_*` (Task 1), `hashPassword` (Task 2).
- Produces: a seeded admin row with a bcrypt `passwordHash`.

- [ ] **Step 1: Confirm the factory accepts passwordHash**

`makeUser(overrides)` spreads `NewUser` overrides and `NewUser = typeof users.$inferInsert`, which now includes `passwordHash` (Task 2). No code change needed unless tsc complains. Verify by reading `src/db/factories.ts`; if a change is needed, add nothing that hardcodes a password.

- [ ] **Step 2: Rewrite the seed**

Replace `scripts/seed.ts` body with:

```ts
import { getDb } from "@/db/client";
import { makeUser } from "@/db/factories";
import { users } from "@/db/schema";
import { hashPassword } from "@/features/auth/password";
import { env } from "@/lib/env";

async function main() {
  if (env.NODE_ENV === "production") {
    throw new Error(
      "Refusing to seed in production: the demo admin is a dev-only account. " +
        "Create your first real user manually instead.",
    );
  }

  const db = getDb();
  const existing = await db.select().from(users);
  if (existing.length > 0) {
    console.log(`Seed skipped: ${existing.length} users already present.`);
    return;
  }

  const passwordHash = await hashPassword(env.SEED_ADMIN_PASSWORD);
  await db
    .insert(users)
    .values([
      makeUser({
        email: env.SEED_ADMIN_EMAIL,
        name: "Admin",
        passwordHash,
      }),
    ]);

  console.log(`Seeded admin user: ${env.SEED_ADMIN_EMAIL}`);
  console.log(`  password: ${env.SEED_ADMIN_PASSWORD} (dev only — change it)`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });
```

- [ ] **Step 3: Verify seed runs and creates a login-able admin**

Run:
```bash
pnpm db:reset
```
Expected: prints `Seeded admin user: admin@example.local` and the password line; exits 0.

- [ ] **Step 4: Verify production refusal**

Run:
```bash
NODE_ENV=production LIFTKIT_DB=pglite AUTH_DEV_BYPASS=false pnpm db:seed; echo "exit: $?"
```
Expected: prints the "Refusing to seed in production" error and exits 1. (AUTH_DEV_BYPASS=false so env parsing itself doesn't throw first.)

- [ ] **Step 5: Commit**

```bash
pnpm format
git add scripts/seed.ts src/db/factories.ts
git commit -m "feat: seed a hashed admin user from env, refuse in production"
```

---

### Task 4: Credentials provider + bypass-aware authorized()

**Files:**
- Modify: `src/lib/auth.ts` (add the `Credentials` provider)
- Modify: `src/lib/auth.config.ts` (`authorized()` honors a `devBypass` flag, threaded for testability)
- Modify: `src/lib/auth.config.test.ts` (existing cases run with bypass off; add a bypass-on case)

**Interfaces:**
- Consumes: `verifyPassword` (Task 2), `env.AUTH_DEV_BYPASS` (Task 1), `getDb`, `users`.
- Produces: working `signIn("credentials", { email, password })`; `authorized()` that allows `/dashboard` when `devBypass` is true.

- [ ] **Step 1: Thread devBypass into buildAuthConfig**

In `src/lib/auth.config.ts`, change `buildAuthConfig` to accept an options object and use it in `authorized`. Current signature:
```ts
export function buildAuthConfig(providerEnv: AuthProviderEnv): NextAuthConfig {
```
becomes:
```ts
export function buildAuthConfig(
  providerEnv: AuthProviderEnv,
  opts: { devBypass?: boolean } = {},
): NextAuthConfig {
```
In the `authorized` callback, change the `/dashboard` branch:
```ts
        if (pathname.startsWith("/dashboard")) {
          return !!auth?.user;
        }
```
to:
```ts
        if (pathname.startsWith("/dashboard")) {
          // Dev bypass: treat every request as authorized so local runs skip
          // sign-in. Guarded off in production by src/lib/env.ts.
          return opts.devBypass === true || !!auth?.user;
        }
```
And update the real singleton at the bottom:
```ts
export const authConfig: NextAuthConfig = buildAuthConfig(env);
```
to:
```ts
export const authConfig: NextAuthConfig = buildAuthConfig(env, {
  devBypass: env.AUTH_DEV_BYPASS,
});
```

- [ ] **Step 2: Update the authorized() tests**

In `src/lib/auth.config.test.ts`, the existing 4 cases assume no bypass. Change the call `buildAuthConfig({})` used there to `buildAuthConfig({}, { devBypass: false })` so those cases test the real gate. Then add a bypass case to the array:
```ts
    {
      name: "/dashboard, no auth, dev bypass on",
      path: "/dashboard",
      auth: null,
      expected: true,
      devBypass: true,
    },
```
Add `devBypass?: boolean` to the case type and pass it through: `buildAuthConfig({}, { devBypass: c.devBypass ?? false })`. (Adapt to the file's exact `it.each` shape — read it first.)

- [ ] **Step 3: Run — verify the authorized tests still pin the gate**

Run: `pnpm exec vitest run src/lib/auth.config.test.ts`
Expected: PASS — 4 real-gate cases + the new bypass-on case.

- [ ] **Step 4: Write a failing authorize() unit test**

Create `src/lib/auth.credentials.test.ts` (Node test, mocks the db + password verify):

```ts
import { describe, expect, it, vi } from "vitest";

const selectMock = vi.fn();
vi.mock("@/db/client", () => ({
  getDb: () => ({
    select: () => ({
      from: () => ({ where: () => ({ limit: () => selectMock() }) }),
    }),
  }),
}));
vi.mock("@/features/auth/password", () => ({
  verifyPassword: vi.fn(async (plain: string, hash: string) => hash === `H:${plain}`),
}));

import { authorizeCredentials } from "./auth";

describe("authorizeCredentials", () => {
  it("returns the user for a correct email+password", async () => {
    selectMock.mockResolvedValueOnce([
      { id: "u1", email: "a@b.c", name: "A", passwordHash: "H:pw" },
    ]);
    const user = await authorizeCredentials({ email: "a@b.c", password: "pw" });
    expect(user).toMatchObject({ id: "u1", email: "a@b.c" });
  });

  it("returns null for a wrong password", async () => {
    selectMock.mockResolvedValueOnce([
      { id: "u1", email: "a@b.c", name: "A", passwordHash: "H:pw" },
    ]);
    expect(
      await authorizeCredentials({ email: "a@b.c", password: "nope" }),
    ).toBeNull();
  });

  it("returns null when no user matches", async () => {
    selectMock.mockResolvedValueOnce([]);
    expect(
      await authorizeCredentials({ email: "x@y.z", password: "pw" }),
    ).toBeNull();
  });

  it("returns null for a user with no passwordHash (OAuth-only)", async () => {
    selectMock.mockResolvedValueOnce([
      { id: "u1", email: "a@b.c", name: "A", passwordHash: null },
    ]);
    expect(
      await authorizeCredentials({ email: "a@b.c", password: "pw" }),
    ).toBeNull();
  });
});
```

- [ ] **Step 5: Run — verify FAIL**

Run: `pnpm exec vitest run src/lib/auth.credentials.test.ts`
Expected: FAIL — `authorizeCredentials` not exported yet.

- [ ] **Step 6: Add the Credentials provider + exported authorize**

In `src/lib/auth.ts`, add imports at the top:
```ts
import Credentials from "next-auth/providers/credentials";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { verifyPassword } from "@/features/auth/password";
```
Add an exported, testable authorize function (so the unit test doesn't need to construct a provider):
```ts
const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

/**
 * Credentials authorize logic, exported for unit testing. Returns the user
 * (id/email/name) on a correct email+password, or null otherwise. Lives in
 * auth.ts (Node-only) — it touches the db and bcrypt, which must never be
 * pulled into the edge-safe auth.config.ts / middleware.
 */
export async function authorizeCredentials(
  raw: unknown,
): Promise<{ id: string; email: string; name: string | null } | null> {
  const parsed = credentialsSchema.safeParse(raw);
  if (!parsed.success) return null;

  const rows = await getDb()
    .select()
    .from(users)
    .where(eq(users.email, parsed.data.email))
    .limit(1);

  const user = rows[0];
  if (!user?.passwordHash) return null;
  if (!(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return null;
  }
  return { id: user.id, email: user.email, name: user.name };
}
```
Then add the provider to the `NextAuth(() => ({ ... }))` config by SPREADING the existing `authConfig.providers` and appending Credentials. Change:
```ts
export const { handlers, auth, signIn, signOut } = NextAuth(() => ({
  ...authConfig,
  adapter: DrizzleAdapter(getDb() as AnyPostgresDatabase, {
```
to include Credentials in the providers array:
```ts
export const { handlers, auth, signIn, signOut } = NextAuth(() => ({
  ...authConfig,
  providers: [
    ...authConfig.providers,
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: (raw) => authorizeCredentials(raw),
    }),
  ],
  adapter: DrizzleAdapter(getDb() as AnyPostgresDatabase, {
```
(Keep the rest of the `NextAuth(() => ({...}))` object unchanged.)

- [ ] **Step 7: Run — verify PASS + typecheck**

Run:
```bash
pnpm exec vitest run src/lib/auth.credentials.test.ts src/lib/auth.config.test.ts
pnpm exec tsc --noEmit
```
Expected: all PASS; no type errors.

- [ ] **Step 8: Commit**

```bash
pnpm format
git add src/lib/auth.ts src/lib/auth.config.ts src/lib/auth.config.test.ts src/lib/auth.credentials.test.ts
git commit -m "feat: credentials provider with db-backed authorize; bypass-aware authorized()"
```

---

### Task 5: Dev bypass in requireUser()

**Files:**
- Modify: `src/features/auth/require-user.ts`
- Modify: `src/features/auth/require-user.test.ts`

**Interfaces:**
- Consumes: `env.AUTH_DEV_BYPASS`, `env.SEED_ADMIN_EMAIL`, `getDb`, `users`.
- Produces: `requireUser()` returns the seeded admin (real db row) when bypass is on and there is no session.

- [ ] **Step 1: Write failing bypass tests**

In `src/features/auth/require-user.test.ts`, add a describe block. Because the file mocks `@/lib/auth`, extend the mocks to cover `@/lib/env` and `@/db/client`:

```ts
  it("returns the seeded admin when dev bypass is on and there is no session", async () => {
    authMock.mockResolvedValue(null);
    vi.doMock("@/lib/env", () => ({
      env: { AUTH_DEV_BYPASS: true, SEED_ADMIN_EMAIL: "admin@example.local" },
    }));
    vi.doMock("@/db/client", () => ({
      getDb: () => ({
        select: () => ({
          from: () => ({
            where: () => ({
              limit: async () => [
                { id: "seed-1", email: "admin@example.local", name: "Admin" },
              ],
            }),
          }),
        }),
      }),
    }));
    const { requireUser } = await import("./require-user");
    const user = await requireUser();
    expect(user).toMatchObject({ id: "seed-1", email: "admin@example.local" });
    expect(redirectMock).not.toHaveBeenCalled();
  });
```

(Follow the file's existing mock/`vi.resetModules()` conventions — read the top of the file. If it does not already `vi.resetModules()` between cases, add `vi.resetModules()` in `afterEach` so the `doMock`s don't leak into the other cases. Ensure the existing "redirects when no session" cases still run with bypass OFF by having them `doMock` `@/lib/env` with `AUTH_DEV_BYPASS: false`, or by keeping the default mock bypass-off — pick the approach that keeps all cases deterministic and note it.)

- [ ] **Step 2: Run — verify FAIL**

Run: `pnpm exec vitest run src/features/auth/require-user.test.ts`
Expected: FAIL — bypass path not implemented (still redirects).

- [ ] **Step 3: Implement the bypass**

In `src/features/auth/require-user.ts`, add imports:
```ts
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { env } from "@/lib/env";
```
In `requireUser()`, after `const session = await auth();` and before the `if (!session?.user)` redirect, insert:
```ts
  if (!session?.user && env.AUTH_DEV_BYPASS) {
    // Dev bypass: act as the seeded admin so local runs skip sign-in. This
    // reads a real db row so downstream writes scoped to user.id hit a real
    // user. Guarded off in production by src/lib/env.ts.
    const rows = await getDb()
      .select()
      .from(users)
      .where(eq(users.email, env.SEED_ADMIN_EMAIL))
      .limit(1);
    const admin = rows[0];
    if (admin) {
      return { id: admin.id, email: admin.email, name: admin.name };
    }
  }
```

- [ ] **Step 4: Run — verify PASS**

Run: `pnpm exec vitest run src/features/auth/require-user.test.ts`
Expected: PASS — bypass case returns the admin; the redirect cases (bypass off) still redirect.

- [ ] **Step 5: Commit**

```bash
pnpm format
git add src/features/auth/require-user.ts src/features/auth/require-user.test.ts
git commit -m "feat: requireUser returns seeded admin under dev bypass"
```

---

### Task 6: Sign-in credentials form + rate-limited login action

**Files:**
- Create: `src/features/auth/sign-in-action.ts` + `src/features/auth/sign-in-action.test.ts`
- Modify: `src/features/auth/sign-in-page.tsx`

**Interfaces:**
- Consumes: `signIn` (auth.ts), `rateLimit` (rate-limit.ts), `safeCallbackUrl`.
- Produces: a credentials sign-in form on `/signin`; the "No auth providers configured" dead-end is removed.

- [ ] **Step 1: Write a failing login-action test (rate limit + validation)**

Create `src/features/auth/sign-in-action.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const signInMock = vi.fn();
vi.mock("@/lib/auth", () => ({ signIn: signInMock }));

import { signInWithPassword } from "./sign-in-action";
import { resetRateLimitStoreForTests } from "@/lib/rate-limit";

describe("signInWithPassword", () => {
  beforeEach(() => {
    signInMock.mockReset();
    resetRateLimitStoreForTests();
  });

  it("rejects invalid input without calling signIn", async () => {
    const res = await signInWithPassword({ email: "not-an-email", password: "" });
    expect(res).toEqual({ ok: false, error: expect.any(String) });
    expect(signInMock).not.toHaveBeenCalled();
  });

  it("calls signIn with credentials for valid input", async () => {
    signInMock.mockResolvedValueOnce(undefined);
    const res = await signInWithPassword({ email: "a@b.c", password: "pw" });
    expect(signInMock).toHaveBeenCalledWith(
      "credentials",
      expect.objectContaining({ email: "a@b.c", password: "pw" }),
    );
    expect(res).toEqual({ ok: true });
  });

  it("rate-limits repeated attempts for the same email", async () => {
    signInMock.mockResolvedValue(undefined);
    let lastError = "";
    for (let i = 0; i < 12; i++) {
      const res = await signInWithPassword({ email: "a@b.c", password: "pw" });
      if (!res.ok) lastError = res.error;
    }
    expect(lastError).toMatch(/too many/i);
  });
});
```

- [ ] **Step 2: Run — verify FAIL**

Run: `pnpm exec vitest run src/features/auth/sign-in-action.test.ts`
Expected: FAIL — `./sign-in-action` does not exist.

- [ ] **Step 3: Write the login action**

Create `src/features/auth/sign-in-action.ts`:

```ts
"use server";

import { z } from "zod";
import { signIn } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  email: z.email(),
  password: z.string().min(1),
  redirectTo: z.string().optional(),
});

/**
 * Credentials sign-in. Follows the security.md boundary pattern: rate-limit
 * the public endpoint, validate with zod, then hand off to Auth.js. A failed
 * credential check surfaces as a thrown Auth.js error caught here and mapped
 * to a generic message (never reveal whether the email exists).
 */
export async function signInWithPassword(input: {
  email: string;
  password: string;
  redirectTo?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Enter a valid email and password." };
  }

  const limit = rateLimit(`signin:${parsed.data.email}`, {
    limit: 10,
    windowMs: 60_000,
  });
  if (!limit.allowed) {
    return { ok: false, error: "Too many attempts — wait a minute and retry." };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: parsed.data.redirectTo ?? "/dashboard",
    });
    return { ok: true };
  } catch (error) {
    // next-auth throws a redirect on success (NEXT_REDIRECT) — rethrow so the
    // framework performs the navigation; only a real auth failure is a value.
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof (error as { digest?: unknown }).digest === "string" &&
      (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    return { ok: false, error: "Invalid email or password." };
  }
}
```

- [ ] **Step 4: Run — verify PASS**

Run: `pnpm exec vitest run src/features/auth/sign-in-action.test.ts`
Expected: PASS.

Note: the redirect-rethrow branch is defensive for the real runtime (where `signIn` redirects on success); the unit test mocks `signIn` to resolve, so it exercises the `{ ok: true }` path. That is acceptable — the branch is covered by the e2e in Task 7.

- [ ] **Step 5: Add the credentials form to the sign-in page**

In `src/features/auth/sign-in-page.tsx`: remove the `providerIds.length === 0` "No auth providers configured" branch entirely. Always render a card with a credentials form, and render the OAuth buttons below it ONLY when `providerIds.length > 0`. The form uses the `Input`/`Label` components already in `src/components/ui/`. Bind it to a thin server-action wrapper that forwards `FormData` to `signInWithPassword` (a `(formData: FormData) => void` "use server" wrapper in the page file, calling `signInWithPassword({ email, password, redirectTo })`). Use design tokens only (no raw colors), a `<Label htmlFor>` per input (a11y). Do NOT prefill the password. Keep the OAuth `signInWithProvider` action and the `safeCallbackUrl(callbackUrl)` handling unchanged for the OAuth section.

Concretely, the new structure:
```tsx
// ...imports: add Input, Label, and signInWithPassword
async function passwordSignIn(formData: FormData) {
  "use server";
  const result = await signInWithPassword({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    redirectTo: safeCallbackUrl(/* callbackUrl */ undefined),
  });
  // On failure we currently rely on the page re-render; a full error-surface
  // is out of scope. Success redirects via the action's signIn call.
  void result;
}
```
Render a single `<Card>` titled "Sign in" with the email+password form (submit button "Sign in"), then, when `providerIds.length > 0`, a divider and the existing provider buttons. (Keep it minimal and token-only; the exact JSX is the implementer's, following the existing card/form idiom in this file.)

- [ ] **Step 6: Typecheck + component render**

Run:
```bash
pnpm exec tsc --noEmit
pnpm exec vitest run src/features/auth
```
Expected: no type errors; auth feature tests pass.

- [ ] **Step 7: Commit**

```bash
pnpm format
git add src/features/auth/sign-in-action.ts src/features/auth/sign-in-action.test.ts src/features/auth/sign-in-page.tsx
git commit -m "feat: credentials sign-in form and rate-limited login action"
```

---

### Task 7: E2E — real login with bypass off

**Files:**
- Modify: `playwright.config.ts` (webServer `env`: `AUTH_DEV_BYPASS=false`)
- Modify: `tests/e2e/smoke.spec.ts` (rewrite the "no-providers" assertion)
- Create: `tests/e2e/auth.spec.ts` (real login → dashboard)

**Interfaces:**
- Consumes: everything from Tasks 1-6; the seeded admin creds are the env defaults (`admin@example.local` / `dev-admin-pw`).

- [ ] **Step 1: Run the e2e server with bypass off**

In `playwright.config.ts`, in `webServer.env`, add `AUTH_DEV_BYPASS: "false"` alongside the existing `AUTH_TRUST_HOST`/`AUTH_SECRET`. This makes the gate real (dashboard requires login) so both the smoke redirect test and the new login test are meaningful.

- [ ] **Step 2: Rewrite the stale smoke assertion**

In `tests/e2e/smoke.spec.ts`, the test `unauthenticated /dashboard redirects to /signin (no-providers state)` asserts the text "No auth providers configured", which no longer exists. Replace its body with:
```ts
    await page.goto("/dashboard");
    // Middleware appends ?callbackUrl=...; match the path only.
    await expect(page).toHaveURL(/\/signin(\?|$)/);
    // The sign-in page now renders a credentials form, not a dead-end card.
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
```
Rename the test title to drop "(no-providers state)" → `unauthenticated /dashboard redirects to /signin`.

- [ ] **Step 3: Write the login e2e**

Create `tests/e2e/auth.spec.ts`:
```ts
import { expect, test } from "@playwright/test";

// The e2e server runs with AUTH_DEV_BYPASS=false (playwright.config.ts) and a
// seeded admin (db:reset in the webServer command). These are the env
// defaults; keep them in sync with .env.example if the defaults change.
const EMAIL = "admin@example.local";
const PASSWORD = "dev-admin-pw";

test.describe("credentials login", () => {
  test("seeded admin can sign in and reach the dashboard", async ({ page }) => {
    await page.goto("/signin");
    await page.getByLabel("Email").fill(EMAIL);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/dashboard(\?|$)/);
  });

  test("wrong password does not reach the dashboard", async ({ page }) => {
    await page.goto("/signin");
    await page.getByLabel("Email").fill(EMAIL);
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/signin(\?|$)/);
  });
});
```

- [ ] **Step 4: Run the full e2e suite**

Run: `pnpm test:e2e`
Expected: PASS — smoke specs (with the rewritten assertion) and both new login specs green. The webServer boots with bypass off, seeds the admin, and the login flow works end to end.

- [ ] **Step 5: Commit**

```bash
pnpm format
git add playwright.config.ts tests/e2e/smoke.spec.ts tests/e2e/auth.spec.ts
git commit -m "test: e2e real credentials login with dev bypass off"
```

---

### Task 8: Liftoff step 4f + security/deploy docs, then full gates + export

**Files:**
- Modify: `.claude/skills/liftoff/SKILL.md` (new sub-step 4f + Step 4 done-when)
- Modify: `docs/rules/security.md` (Auth section)
- Modify: `docs/playbooks/deploy.md` (production auth checklist)

**Interfaces:**
- Consumes: the behavior built in Tasks 1-7 (documentation).

- [ ] **Step 1: Add sub-step 4f to liftoff**

In `.claude/skills/liftoff/SKILL.md`, after sub-step 4e, add:

```markdown
### 4f — Auth mode

The template ships a working email/password login with a seeded admin, and a
dev bypass (`AUTH_DEV_BYPASS=true`) so local runs skip sign-in. Explain this to
the user and let them choose — one question:

1. Show the seeded admin credentials (`SEED_ADMIN_EMAIL` /
   `SEED_ADMIN_PASSWORD` from `.env`) so they can log in.
2. Explain the three options and apply their choice by editing `.env` (not
   code): **keep the bypass on** (default, fastest local dev); **turn the
   bypass off** (`AUTH_DEV_BYPASS=false`) to exercise the real login now; or
   **add OAuth** (set `AUTH_GITHUB_*` / `AUTH_GOOGLE_*` — the sign-in page
   shows provider buttons automatically when they are set).
3. Note that OAuth (Google/GitHub) requires reaching those providers, which is
   not always possible in every region — credentials login always works.

**Done when:** the choice is recorded in `.env` and `pnpm lint && pnpm test`
are green. Commit: `liftoff: step 4f — auth mode <mode>`.
```

- [ ] **Step 2: Add 4f to Step 4's done-when checklist**

In the `**Step 4 done when**` list at the top of Step 4, add a sixth item:
```markdown
- [ ] 4f — auth mode chosen and recorded in `.env` (`AUTH_DEV_BYPASS` set
      deliberately; creds shown to the user).
```

- [ ] **Step 3: Update security.md Auth section**

In `docs/rules/security.md`'s `## Auth` section, add bullets documenting: credentials login lives in `src/lib/auth.ts` (never the edge-safe config); `AUTH_DEV_BYPASS` must be false in production (enforced by `src/lib/env.ts`); the seed refuses to run in production; the sign-in action rate-limits before checking the hash. Keep the existing bullets.

- [ ] **Step 4: Update the deploy playbook**

In `docs/playbooks/deploy.md`, add a production-auth checklist item: set `AUTH_DEV_BYPASS=false` (the app refuses to boot otherwise), do NOT run `pnpm db:seed` against production (it refuses), create the first real user manually, and set `AUTH_SECRET`.

- [ ] **Step 5: Full gate sequence**

Run:
```bash
pnpm lint && pnpm test && pnpm test:e2e && pnpm build
```
Expected: all four green.

- [ ] **Step 6: Export cleanliness**

Stash any pre-existing untracked files first (`git stash push -u -- <paths>` for anything not part of this work), then:
```bash
scripts/export-template.sh
```
Expected: `✅ Export assertions passed.` Confirm the exported `package.json` lists `bcryptjs`, and `.env.example` documents `AUTH_DEV_BYPASS`/`SEED_ADMIN_*`. Restore the stash after.

- [ ] **Step 7: Commit the docs**

```bash
pnpm format
git add .claude/skills/liftoff/SKILL.md docs/rules/security.md docs/playbooks/deploy.md
git commit -m "docs: liftoff auth-mode step 4f; security and deploy auth notes"
```

---

## Self-Review

**Spec coverage (2026-07-09-default-auth-design.md):**
- §2 defaults (credentials on, bypass on, OAuth off), no roles → Tasks 1,4,6 (no role column anywhere). ✓
- §3 passwordHash nullable + migration + bcryptjs → Task 2. ✓
- §4 credentials only in auth.ts, edge-safe config untouched by db/bcrypt → Task 4 (authorizeCredentials in auth.ts; auth.config.ts only gains a pure devBypass flag). ✓
- §5 dev bypass + env production guard → Task 1 (guard), Task 4 (authorized), Task 5 (requireUser). ✓
- §6 env-driven seed creds, hashed, prod-refusing → Tasks 1,3. ✓
- §7 e2e with bypass off, rewrite smoke, new login e2e → Task 7. ✓
- §8 rate-limit before hash check, zod validation → Task 6. ✓
- §9 liftoff 4f → Task 8. ✓
- §10 tests (env guard, hash, authorize accept/reject, require-user bypass, rate-limit, e2e) → Tasks 1,2,4,5,6,7. ✓
- §11 all listed files → Tasks 1-8. ✓

**Placeholder scan:** No TBD/TODO. The sign-in-page JSX (Task 6 Step 5) is described structurally rather than as a full code block because it must follow the file's existing card/form idiom and use the Input/Label components — the constraints (token-only, a11y labels, no prefilled password, remove the dead-end branch, OAuth only when configured) are explicit and checkable.

**Type/name consistency:** `authorizeCredentials`, `hashPassword`/`verifyPassword`, `signInWithPassword`, `AUTH_DEV_BYPASS`, `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` spelled identically across tasks. The seeded creds (`admin@example.local` / `dev-admin-pw`) match between Task 1 defaults, Task 3 seed, and Task 7 e2e.

**Green-commit check:** each task commits green. TDD tasks (1,2,4,5,6) show RED (test before impl) then GREEN before their commit; Tasks 3,7,8 are verified by running the commands they specify. Task 7's smoke rewrite is required BECAUSE Task 6 removes the asserted text — they are in the right order (6 before 7).

**Security self-check (security.md gates):**
- New env vars get schema + .env.example + test (Task 1). ✓
- New server action (`signInWithPassword`) validates with zod and rate-limits (Task 6). ✓
- No secret literal committed — creds come from env; the seed refuses in prod (Tasks 1,3). ✓
- `pnpm audit --audit-level high` green after bcryptjs (Task 2). ✓
- Edge/middleware stays db-free — credentials + bcrypt only in auth.ts (Task 4). ✓
