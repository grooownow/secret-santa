import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { accounts, authTokens, settings, users } from "@/db/schema";
import { makeUser } from "@/db/factories";
import { setMailTransportForTests, type MailMessage } from "@/features/mail";
import { hashPassword, verifyPassword } from "@/lib/password";
import { resetRateLimitStoreForTests } from "@/lib/rate-limit";
import { createTestDb, type TestDb } from "./helpers/test-db";

let db: TestDb;
let cleanup: () => Promise<void>;

const cookieStore = new Map<string, string>();
const cookieSet = vi.fn((name: string, value: string) => {
  cookieStore.set(name, value);
});
const authMock = vi.fn();
const signInMock = vi.fn();

vi.mock("@/db/client", () => ({ getDb: () => db }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    set: cookieSet,
    get: (name: string) =>
      cookieStore.has(name) ? { value: cookieStore.get(name) } : undefined,
  }),
  headers: async () => new Headers({ "accept-language": "es" }),
}));
vi.mock("@/lib/auth", () => ({
  auth: () => authMock(),
  signIn: (...args: unknown[]) => signInMock(...args),
}));

const sent: MailMessage[] = [];

beforeAll(async () => {
  ({ db, cleanup } = await createTestDb());
  setMailTransportForTests(async (m) => {
    sent.push(m);
  });
});
afterAll(async () => {
  setMailTransportForTests(null);
  await cleanup();
});
beforeEach(async () => {
  sent.length = 0;
  cookieStore.clear();
  cookieSet.mockClear();
  authMock.mockReset();
  signInMock.mockReset();
  resetRateLimitStoreForTests();
  await db.delete(authTokens);
  await db.delete(accounts);
  await db.delete(users);
  await db.delete(settings);
  vi.useRealTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
}

const validRegistration = {
  email: "Neighbour@Example.COM",
  password: "correct horse",
  locale: "de",
  consent: "on",
  age14: "on",
};

async function redirectTarget(run: () => Promise<unknown>): Promise<string> {
  const error: unknown = await run().then(
    () => undefined,
    (e: unknown) => e,
  );
  const digest = (error as { digest?: string } | undefined)?.digest;
  if (!digest?.startsWith("NEXT_REDIRECT")) {
    throw new Error(`expected a redirect, got ${String(error)}`);
  }
  return digest.split(";")[2] ?? "";
}

function tokenFrom(mail: MailMessage | undefined): string {
  const match = /token=([\w-]+)/.exec(mail?.text ?? "");
  if (!match?.[1]) throw new Error("no token link in the mail");
  return match[1];
}

async function register(fields: Record<string, string> = validRegistration) {
  const { registerAction } = await import("@/features/account/register-action");
  return registerAction({}, form(fields));
}

function makeAdapter() {
  // Same narrow cast as src/lib/auth.ts: the adapter's generics do not accept
  // Drizzle's concrete PGlite type directly.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type AnyPg = PgDatabase<PgQueryResultHKT, any>;
  return DrizzleAdapter(db as unknown as AnyPg, {
    usersTable: users,
    accountsTable: accounts,
  });
}

async function allUsers() {
  return db.select().from(users);
}

describe("registration", () => {
  it("register stores lowercase email, consent version and sends verify mail", async () => {
    const target = await redirectTarget(() => register());

    expect(target).toBe("/check-email?email=neighbour%40example.com");
    const [user] = await allUsers();
    expect(user).toMatchObject({
      email: "neighbour@example.com",
      locale: "de",
      consentVersion: "2026-10-31",
      emailVerified: null,
    });
    expect(user?.consentAt).toBeInstanceOf(Date);
    expect(user?.passwordHash).not.toBe(validRegistration.password);
    expect(cookieStore.get("locale")).toBe("de");

    expect(sent).toHaveLength(1);
    expect(sent[0]?.to).toBe("neighbour@example.com");
    expect(sent[0]?.text).toContain("/verify-email?token=");
    // Only the hash of the token is stored.
    const [stored] = await db.select().from(authTokens);
    expect(stored?.purpose).toBe("verify");
    expect(stored?.tokenHash).not.toBe(tokenFrom(sent[0]));
    expect(stored?.tokenHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("register without consent is rejected", async () => {
    const state = await register({ ...validRegistration, consent: "" });
    expect(state.error).toBe("consent");
    expect(await allUsers()).toHaveLength(0);
    expect(sent).toHaveLength(0);
  });

  it("register requires the 14+ confirmation", async () => {
    const state = await register({ ...validRegistration, age14: "" });
    expect(state.error).toBe("age");
    expect(await allUsers()).toHaveLength(0);
  });

  it("rejects a password shorter than 8 characters", async () => {
    const state = await register({ ...validRegistration, password: "short" });
    expect(state.error).toBe("password");
    expect(await allUsers()).toHaveLength(0);
  });

  it("registering an existing email looks identical to a new one", async () => {
    const fresh = await redirectTarget(() => register());
    // A second person tries the same address with another password.
    const again = await redirectTarget(() =>
      register({ ...validRegistration, password: "attacker-password" }),
    );
    expect(again).toBe(fresh);

    const rows = await allUsers();
    expect(rows).toHaveLength(1);
    // The existing account is untouched: the attacker did not set a password.
    expect(
      await verifyPassword("correct horse", rows[0]?.passwordHash ?? ""),
    ).toBe(true);
    expect(
      await verifyPassword("attacker-password", rows[0]?.passwordHash ?? ""),
    ).toBe(false);
  });

  it("does not mail an existing verified account", async () => {
    await db.insert(users).values(
      makeUser({
        email: "neighbour@example.com",
        emailVerified: new Date(),
        passwordHash: await hashPassword("whatever-pass"),
      }),
    );
    await redirectTarget(() => register());
    expect(sent).toHaveLength(0);
    expect(await allUsers()).toHaveLength(1);
  });

  it("registration after the deadline is rejected", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-12-07T10:00:00+01:00"));
    const state = await register();
    expect(state.error).toBe("closed");
    expect(await allUsers()).toHaveLength(0);
  });

  it("registration on the last day is accepted", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-12-06T22:00:00+01:00"));
    await redirectTarget(() => register());
    expect(await allUsers()).toHaveLength(1);
  });

  it("limits registration to 5 per minute per email", async () => {
    for (let i = 0; i < 5; i++) {
      // oxlint-disable-next-line no-await-in-loop
      await redirectTarget(() => register());
    }
    const state = await register();
    expect(state.error).toBe("rate");
  });
});

describe("email verification", () => {
  async function newUser() {
    const [u] = await db
      .insert(users)
      .values(makeUser({ email: "v@example.com" }))
      .returning();
    if (!u) throw new Error("insert failed");
    return u;
  }

  it("verify token works once and expires after 7 days", async () => {
    const { issueToken } = await import("@/features/account/tokens");
    const { verifyEmailToken } =
      await import("@/features/account/verify-email-action");
    const user = await newUser();

    const token = await issueToken(user.id, "verify");
    expect(await verifyEmailToken(token)).toBe(true);
    expect(await verifyEmailToken(token)).toBe(false);
    const [row] = await db.select().from(users).where(eq(users.id, user.id));
    expect(row?.emailVerified).toBeInstanceOf(Date);

    await db.update(users).set({ emailVerified: null });
    vi.useFakeTimers({ toFake: ["Date"] });
    const base = Date.now();
    const late = await issueToken(user.id, "verify");
    vi.setSystemTime(base + 7 * 24 * 3600_000 - 1000);
    // Still valid a second before 7 days, and then expired right after.
    const edge = await issueToken(user.id, "verify");
    vi.setSystemTime(base + 7 * 24 * 3600_000 + 1000);
    expect(await verifyEmailToken(late)).toBe(false);
    expect(await verifyEmailToken(edge)).toBe(true);
  });

  it("a verify token cannot be used as a reset token", async () => {
    const { issueToken, consumeToken } =
      await import("@/features/account/tokens");
    const user = await newUser();
    const token = await issueToken(user.id, "verify");
    expect(await consumeToken(token, "reset")).toBeNull();
    expect(await consumeToken(token, "verify")).toBe(user.id);
  });

  it("resend is allowed once per 60 seconds", async () => {
    const { resendVerificationAction } =
      await import("@/features/account/resend-action");
    await newUser();
    const first = await resendVerificationAction(
      {},
      form({ email: "V@example.com" }),
    );
    expect(first.status).toBe("sent");
    expect(sent).toHaveLength(1);

    const second = await resendVerificationAction(
      {},
      form({ email: "v@example.com" }),
    );
    expect(second.status).toBe("wait");
    expect(second.retryAfter).toBeGreaterThan(0);
    expect(second.retryAfter).toBeLessThanOrEqual(60);
    expect(sent).toHaveLength(1);
  });

  it("registration counts toward the 60 second resend limit", async () => {
    const { resendVerificationAction } =
      await import("@/features/account/resend-action");
    await redirectTarget(() => register());
    const res = await resendVerificationAction(
      {},
      form({ email: "neighbour@example.com" }),
    );
    expect(res.status).toBe("wait");
    expect(sent).toHaveLength(1);
  });

  it("resend answers the same for an unknown email and sends nothing", async () => {
    const { resendVerificationAction } =
      await import("@/features/account/resend-action");
    const res = await resendVerificationAction(
      {},
      form({ email: "nobody@example.com" }),
    );
    expect(res.status).toBe("sent");
    expect(sent).toHaveLength(0);
  });
});

describe("password reset", () => {
  async function userWithPassword() {
    const [u] = await db
      .insert(users)
      .values(
        makeUser({
          email: "r@example.com",
          passwordHash: await hashPassword("old-password"),
        }),
      )
      .returning();
    if (!u) throw new Error("insert failed");
    return u;
  }

  it("reset token expires after 1 hour and changes the password", async () => {
    const { resetPasswordAction } =
      await import("@/features/account/reset-password-action");
    const { issueToken } = await import("@/features/account/tokens");
    const user = await userWithPassword();

    const token = await issueToken(user.id, "reset");
    const ok = await resetPasswordAction(
      {},
      form({ token, password: "brand-new-pass", confirm: "brand-new-pass" }),
    );
    expect(ok).toEqual({});
    expect(signInMock).toHaveBeenCalledWith(
      "credentials",
      expect.objectContaining({
        email: "r@example.com",
        password: "brand-new-pass",
      }),
    );
    const [row] = await db.select().from(users).where(eq(users.id, user.id));
    expect(
      await verifyPassword("brand-new-pass", row?.passwordHash ?? ""),
    ).toBe(true);
    expect(await verifyPassword("old-password", row?.passwordHash ?? "")).toBe(
      false,
    );
    expect(row?.emailVerified).toBeInstanceOf(Date);

    // The same link does not work twice.
    expect(
      await resetPasswordAction(
        {},
        form({ token, password: "another-pass-1", confirm: "another-pass-1" }),
      ),
    ).toEqual({ error: "expired" });

    // A fresh link is dead after an hour.
    vi.useFakeTimers({ toFake: ["Date"] });
    const stale = await issueToken(user.id, "reset");
    vi.setSystemTime(Date.now() + 61 * 60_000);
    expect(
      await resetPasswordAction(
        {},
        form({
          token: stale,
          password: "late-password",
          confirm: "late-password",
        }),
      ),
    ).toEqual({ error: "expired" });
    const [after] = await db.select().from(users).where(eq(users.id, user.id));
    expect(
      await verifyPassword("brand-new-pass", after?.passwordHash ?? ""),
    ).toBe(true);
  });

  it("a mistyped confirmation does not burn the link", async () => {
    const { resetPasswordAction } =
      await import("@/features/account/reset-password-action");
    const { issueToken } = await import("@/features/account/tokens");
    const user = await userWithPassword();
    const token = await issueToken(user.id, "reset");

    expect(
      await resetPasswordAction(
        {},
        form({ token, password: "brand-new-pass", confirm: "different-pass" }),
      ),
    ).toEqual({ error: "mismatch" });
    expect(
      await resetPasswordAction(
        {},
        form({ token, password: "short", confirm: "short" }),
      ),
    ).toEqual({ error: "password" });
    expect(
      await resetPasswordAction(
        {},
        form({ token, password: "brand-new-pass", confirm: "brand-new-pass" }),
      ),
    ).toEqual({});
  });

  it("forgot password answers the same for an unknown email", async () => {
    const { forgotPasswordAction } =
      await import("@/features/account/forgot-password-action");
    await userWithPassword();

    const known = await forgotPasswordAction(
      {},
      form({ email: "r@example.com" }),
    );
    expect(sent).toHaveLength(1);
    expect(sent[0]?.text).toContain("/reset-password?token=");
    const unknown = await forgotPasswordAction(
      {},
      form({ email: "nobody@example.com" }),
    );
    expect(sent).toHaveLength(1);

    expect(known).toEqual({ status: "sent", email: "r@example.com" });
    expect(unknown).toEqual({ status: "sent", email: "nobody@example.com" });
  });

  it("limits forgot password to 5 per minute per email", async () => {
    const { forgotPasswordAction } =
      await import("@/features/account/forgot-password-action");
    for (let i = 0; i < 5; i++) {
      // oxlint-disable-next-line no-await-in-loop
      await forgotPasswordAction({}, form({ email: "r@example.com" }));
    }
    const sixth = await forgotPasswordAction(
      {},
      form({ email: "R@example.com" }),
    );
    expect(sixth.status).toBe("rate");
  });
});

describe("google sign-in", () => {
  it("google sign-in of a new email after the deadline is refused", async () => {
    const { googleSignInAllowed } = await import("@/lib/auth-events");
    const before = new Date("2026-12-06T12:00:00+01:00");
    const after = new Date("2026-12-07T12:00:00+01:00");

    expect(await googleSignInAllowed("New@Example.com", true, before)).toBe(
      true,
    );
    expect(await googleSignInAllowed("new@example.com", true, after)).toBe(
      false,
    );
    expect(await allUsers()).toHaveLength(0);
  });

  it("refuses a Google email that Google itself has not verified", async () => {
    const { googleSignInAllowed } = await import("@/lib/auth-events");
    expect(
      await googleSignInAllowed(
        "x@example.com",
        false,
        new Date("2026-12-01T12:00:00+01:00"),
      ),
    ).toBe(false);
  });

  it("google sign-in with an email registered by password opens the same account", async () => {
    const { googleSignInAllowed } = await import("@/lib/auth-events");
    const { buildProviders } = await import("@/lib/auth.config");
    await redirectTarget(() => register());
    const [existing] = await allUsers();

    // Even after the deadline: an existing account may still sign in.
    const after = new Date("2026-12-07T12:00:00+01:00");
    expect(
      await googleSignInAllowed("neighbour@example.com", true, after),
    ).toBe(true);

    // What Auth.js does with allowDangerousEmailAccountLinking: look the user
    // up by email and link the Google account to it.
    const google = buildProviders({
      AUTH_GOOGLE_ID: "id",
      AUTH_GOOGLE_SECRET: "secret",
    })[0] as { options?: { allowDangerousEmailAccountLinking?: boolean } };
    expect(google.options?.allowDangerousEmailAccountLinking).toBe(true);

    const adapter = makeAdapter();
    const found = await adapter.getUserByEmail?.("neighbour@example.com");
    expect(found?.id).toBe(existing?.id);
    await adapter.linkAccount?.({
      userId: found?.id ?? "",
      type: "oidc",
      provider: "google",
      providerAccountId: "g-1",
    });
    expect(await allUsers()).toHaveLength(1);
    expect(await db.select().from(accounts)).toHaveLength(1);
  });

  it("linking drops the password of a never-verified account (pre-hijack)", async () => {
    const { googleSignInAllowed } = await import("@/lib/auth-events");
    await redirectTarget(() => register());

    expect(
      await googleSignInAllowed(
        "neighbour@example.com",
        true,
        new Date("2026-12-01T12:00:00+01:00"),
      ),
    ).toBe(true);
    const [row] = await allUsers();
    expect(row?.passwordHash).toBeNull();
    expect(row?.emailVerified).toBeInstanceOf(Date);
  });

  it("a verified password account keeps its password when Google links", async () => {
    const { googleSignInAllowed } = await import("@/lib/auth-events");
    await db.insert(users).values(
      makeUser({
        email: "keep@example.com",
        emailVerified: new Date(),
        passwordHash: await hashPassword("keep-this-pw"),
      }),
    );
    await googleSignInAllowed(
      "keep@example.com",
      true,
      new Date("2026-12-01T12:00:00+01:00"),
    );
    const [row] = await allUsers();
    expect(row?.passwordHash).not.toBeNull();
  });

  it("a google account is treated as verified, with the visitor's language", async () => {
    const { onGoogleUserCreated } = await import("@/lib/auth-events");
    const { requireVerifiedAccount } =
      await import("@/features/auth/require-account");
    cookieStore.set("locale", "uk");

    const adapter = makeAdapter();
    const created = await adapter.createUser?.({
      id: "ignored",
      email: "g@example.com",
      emailVerified: null,
      name: "G",
    });
    await onGoogleUserCreated(created?.id ?? "");

    const [row] = await allUsers();
    expect(row?.emailVerified).toBeInstanceOf(Date);
    expect(row?.locale).toBe("uk");

    authMock.mockResolvedValue({ user: { id: row?.id } });
    // Consent is still missing, so the guard stops at /welcome, not /check-email.
    expect(await redirectTarget(() => requireVerifiedAccount())).toBe(
      "/welcome",
    );
  });

  it("a google account without consent is sent to /welcome, not to /home", async () => {
    const { requireAccount } = await import("@/features/auth/require-account");
    const { acceptConsentAction } =
      await import("@/features/account/accept-consent-action");
    const [user] = await db
      .insert(users)
      .values(makeUser({ email: "w@example.com", emailVerified: new Date() }))
      .returning();
    authMock.mockResolvedValue({
      user: { id: user?.id, email: "w@example.com" },
    });

    expect(await redirectTarget(() => requireAccount())).toBe("/welcome");
    // /welcome itself loads the account without redirecting again.
    await expect(
      requireAccount({ allowWithoutConsent: true }),
    ).resolves.toMatchObject({ id: user?.id });

    // Giving consent needs both boxes.
    expect(
      await acceptConsentAction(
        {},
        form({ locale: "es", consent: "on", age14: "" }),
      ),
    ).toEqual({ error: "age" });
    expect(
      await acceptConsentAction(
        {},
        form({ locale: "es", consent: "", age14: "on" }),
      ),
    ).toEqual({ error: "consent" });

    expect(
      await redirectTarget(() =>
        acceptConsentAction(
          {},
          form({ locale: "es", consent: "on", age14: "on" }),
        ),
      ),
    ).toBe("/home");
    const [row] = await allUsers();
    expect(row).toMatchObject({ locale: "es", consentVersion: "2026-10-31" });
    expect(row?.consentAt).toBeInstanceOf(Date);
    expect(cookieStore.get("locale")).toBe("es");

    await expect(requireAccount()).resolves.toMatchObject({ id: user?.id });
  });
});

describe("locale after sign-in", () => {
  it("sets the locale cookie from users.locale", async () => {
    const { syncLocaleCookie } = await import("@/lib/auth-events");
    const [user] = await db
      .insert(users)
      .values(makeUser({ locale: "ru" }))
      .returning();
    await syncLocaleCookie(user?.id ?? "");
    expect(cookieSet).toHaveBeenCalledWith(
      "locale",
      "ru",
      expect.objectContaining({ path: "/" }),
    );
  });

  it("does nothing for an unknown user", async () => {
    const { syncLocaleCookie } = await import("@/lib/auth-events");
    await syncLocaleCookie("00000000-0000-0000-0000-000000000000");
    expect(cookieSet).not.toHaveBeenCalled();
  });
});
