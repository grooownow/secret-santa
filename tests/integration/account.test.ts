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
import { accounts, authTokens, sentEmails, settings, users } from "@/db/schema";
import { makeUser } from "@/db/factories";
import { setMailTransportForTests, type MailMessage } from "@/features/mail";
import { setRunAfterResponseForTests } from "@/lib/run-after-response";
import { hashPassword, verifyPassword } from "@/lib/password";
import { resetRateLimitStoreForTests } from "@/lib/rate-limit";
import { createTestDb, type TestDb } from "./helpers/test-db";

let db: TestDb;
let cleanup: () => Promise<void>;

const cookieStore = new Map<string, string>();
const cookieSet = vi.fn((name: string, value: string) => {
  cookieStore.set(name, value);
});
let requestHeaders = new Headers({ "accept-language": "es" });
const authMock = vi.fn();
const signInMock = vi.fn();

vi.mock("@/db/client", () => ({ getDb: () => db }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    set: cookieSet,
    get: (name: string) =>
      cookieStore.has(name) ? { value: cookieStore.get(name) } : undefined,
  }),
  headers: async () => requestHeaders,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/env", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/env")>();
  return { env: { ...original.env, ADMIN_EMAIL: "kate@example.dev" } };
});
vi.mock("@/lib/auth", () => ({
  auth: () => authMock(),
  signIn: (...args: unknown[]) => signInMock(...args),
}));

const sent: MailMessage[] = [];
const deferredWork: Promise<unknown>[] = [];
const runner = (work: () => unknown) => {
  deferredWork.push(Promise.resolve().then(work));
};

/** Waits for everything the actions queued for after the response. */
async function flush() {
  while (deferredWork.length) {
    // oxlint-disable-next-line no-await-in-loop
    await deferredWork.shift();
  }
}

beforeAll(async () => {
  ({ db, cleanup } = await createTestDb());
  setMailTransportForTests(async (m) => {
    sent.push(m);
  });
  setRunAfterResponseForTests(runner);
});
afterAll(async () => {
  setMailTransportForTests(null);
  setRunAfterResponseForTests(null);
  await cleanup();
});
beforeEach(async () => {
  sent.length = 0;
  cookieStore.clear();
  cookieSet.mockClear();
  authMock.mockReset();
  signInMock.mockReset();
  resetRateLimitStoreForTests();
  requestHeaders = new Headers({ "accept-language": "es" });
  await db.delete(sentEmails);
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

/** Opens a verify link in the browser whose cookies are in `cookieStore`. */
async function verifyResult(token: string) {
  const { verifyEmailToken } =
    await import("@/features/account/verify-email-action");
  return verifyEmailToken(token, cookieStore.get("reg_nonce"));
}

async function verifyWith(token: string) {
  return (await verifyResult(token)).status !== "invalid";
}

/** Runs `fn` as another browser (its own cookie jar), then switches back. */
async function inBrowser<T>(jar: Map<string, string>, fn: () => Promise<T>) {
  const previous = new Map(cookieStore);
  cookieStore.clear();
  for (const [k, v] of jar) cookieStore.set(k, v);
  try {
    return await fn();
  } finally {
    jar.clear();
    for (const [k, v] of cookieStore) jar.set(k, v);
    cookieStore.clear();
    for (const [k, v] of previous) cookieStore.set(k, v);
  }
}

/** The owner picks a password from the reset link they were sent to. */
async function chooseOwnPassword(token: string, password: string) {
  const { resetPasswordAction } =
    await import("@/features/account/reset-password-action");
  return resetPasswordAction({}, form({ token, password, confirm: password }));
}

async function userByEmail(email: string) {
  const [row] = await db.select().from(users).where(eq(users.email, email));
  return row;
}

describe("registration", () => {
  it("register stores lowercase email, binds password and consent to the verify token and sends the mail", async () => {
    const target = await redirectTarget(() => register());
    await flush();

    expect(target).toBe("/check-email?email=neighbour%40example.com");
    // Nothing the registrant chose is on the user row before verification.
    const user = await userByEmail("neighbour@example.com");
    expect(user).toMatchObject({
      email: "neighbour@example.com",
      passwordHash: null,
      consentAt: null,
      emailVerified: null,
    });
    expect(cookieStore.get("locale")).toBe("de");

    expect(sent).toHaveLength(1);
    expect(sent[0]?.to).toBe("neighbour@example.com");
    expect(sent[0]?.text).toContain("/verify-email?token=");
    // Only the hash of the token is stored, with the pending data.
    const [stored] = await db.select().from(authTokens);
    expect(stored?.purpose).toBe("verify");
    expect(stored?.tokenHash).not.toBe(tokenFrom(sent[0]));
    expect(stored?.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(stored).toMatchObject({
      pendingLocale: "de",
      pendingConsentVersion: "2026-10-31",
    });
    expect(stored?.pendingConsentAt).toBeInstanceOf(Date);
    expect(stored?.pendingPasswordHash).not.toBe(validRegistration.password);

    // Verifying applies the registration.
    expect(await verifyWith(tokenFrom(sent[0]))).toBe(true);
    const verified = await userByEmail("neighbour@example.com");
    expect(verified).toMatchObject({
      locale: "de",
      consentVersion: "2026-10-31",
    });
    expect(verified?.emailVerified).toBeInstanceOf(Date);
    expect(verified?.consentAt).toBeInstanceOf(Date);
    expect(
      await verifyPassword("correct horse", verified?.passwordHash ?? ""),
    ).toBe(true);
  });

  it("register without consent is rejected", async () => {
    const state = await register({ ...validRegistration, consent: "" });
    await flush();
    expect(state.error).toBe("consent");
    expect(await allUsers()).toHaveLength(0);
    expect(sent).toHaveLength(0);
  });

  it("register requires the 14+ confirmation", async () => {
    const state = await register({ ...validRegistration, age14: "" });
    await flush();
    expect(state.error).toBe("age");
    expect(await allUsers()).toHaveLength(0);
  });

  it("rejects a password shorter than 8 characters", async () => {
    const state = await register({ ...validRegistration, password: "short" });
    await flush();
    expect(state.error).toBe("password");
    expect(await allUsers()).toHaveLength(0);
  });

  it("registering an existing email looks identical to a new one", async () => {
    const fresh = await redirectTarget(() => register());
    await flush();
    const again = await redirectTarget(() =>
      register({ ...validRegistration, email: "someone@example.com" }),
    );
    await flush();
    // Same redirect shape for a new and for an already known address.
    expect(again.replace("someone%40", "neighbour%40")).toBe(fresh);

    const second = await redirectTarget(() => register());
    await flush();
    expect(second).toBe(fresh);
  });

  it("owner registers, attacker re-registers, owner clicks the newest link in their own browser: the attacker's password is not applied", async () => {
    const owner = new Map<string, string>();
    const attacker = new Map<string, string>();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-12-01T12:00:00+01:00"));
    await inBrowser(owner, () =>
      redirectTarget(() =>
        register({ ...validRegistration, password: "owner-password" }),
      ),
    );
    // After the 60 second slot, a new registration mails again.
    vi.setSystemTime(new Date("2026-12-01T12:01:01+01:00"));
    await inBrowser(attacker, () =>
      redirectTarget(() =>
        register({ ...validRegistration, password: "attacker-password" }),
      ),
    );
    await flush();
    expect(sent).toHaveLength(2);
    // The attacker's registration killed the owner's own link...
    const ownerMail = sent[0];
    const newestMail = sent[1];
    expect(
      await inBrowser(owner, () => verifyResult(tokenFrom(ownerMail))),
    ).toEqual({ status: "invalid" });
    // ...and the owner opens the newest one (the one carrying the attacker's data).
    const result = await inBrowser(owner, () =>
      verifyResult(tokenFrom(newestMail)),
    );
    expect(result.status).toBe("choose-password");

    const row = await userByEmail("neighbour@example.com");
    expect(row?.emailVerified).toBeInstanceOf(Date);
    expect(row?.passwordHash).toBeNull();
    expect(row?.consentAt).toBeNull();
    expect(row?.sessionVersion).toBe(1);

    // The owner picks their own password on the reset page.
    if (result.status !== "choose-password") throw new Error("unreachable");
    await chooseOwnPassword(result.resetToken, "owner-own-password");
    const after = await userByEmail("neighbour@example.com");
    expect(
      await verifyPassword("owner-own-password", after?.passwordHash ?? ""),
    ).toBe(true);
    expect(
      await verifyPassword("attacker-password", after?.passwordHash ?? ""),
    ).toBe(false);
  });

  it("attacker registers first, the owner opens the mail in their browser: the owner chooses the password", async () => {
    const attacker = new Map<string, string>();
    const owner = new Map<string, string>();
    await inBrowser(attacker, () =>
      redirectTarget(() =>
        register({ ...validRegistration, password: "attacker-password" }),
      ),
    );
    await flush();

    const result = await inBrowser(owner, () =>
      verifyResult(tokenFrom(sent[0])),
    );
    expect(result.status).toBe("choose-password");
    expect(
      (await userByEmail("neighbour@example.com"))?.passwordHash,
    ).toBeNull();
    if (result.status !== "choose-password") throw new Error("unreachable");
    await chooseOwnPassword(result.resetToken, "owner-own-password");
    const row = await userByEmail("neighbour@example.com");
    expect(
      await verifyPassword("attacker-password", row?.passwordHash ?? ""),
    ).toBe(false);
    expect(
      await verifyPassword("owner-own-password", row?.passwordHash ?? ""),
    ).toBe(true);
  });

  it("same browser: opening the link applies the password and consent, no reset step", async () => {
    await redirectTarget(() =>
      register({ ...validRegistration, password: "owner-password" }),
    );
    await flush();
    const result = await verifyResult(tokenFrom(sent[0]));
    expect(result).toEqual({ status: "verified" });
    const row = await userByEmail("neighbour@example.com");
    expect(
      await verifyPassword("owner-password", row?.passwordHash ?? ""),
    ).toBe(true);
    expect(row?.consentAt).toBeInstanceOf(Date);
    const reset = (await db.select().from(authTokens)).filter(
      (t) => t.purpose === "reset",
    );
    expect(reset).toHaveLength(0);
  });

  it("other device: the real owner opening the link elsewhere still ends up choosing a password", async () => {
    const phone = new Map<string, string>();
    await redirectTarget(() => register());
    await flush();
    const result = await inBrowser(phone, () =>
      verifyResult(tokenFrom(sent[0])),
    );
    expect(result.status).toBe("choose-password");
    const row = await userByEmail("neighbour@example.com");
    expect(row?.emailVerified).toBeInstanceOf(Date);
    expect(row?.passwordHash).toBeNull();
    expect(row?.consentAt).toBeNull();
  });

  it("resend from a browser without the matching nonce carries no registration data", async () => {
    const { resendVerificationAction } =
      await import("@/features/account/resend-action");
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-12-01T12:00:00+01:00"));
    await redirectTarget(() =>
      register({ ...validRegistration, password: "owner-password" }),
    );
    await flush();
    vi.setSystemTime(new Date("2026-12-01T12:02:00+01:00"));

    // The attacker, from their browser, asks for a resend of the owner's address.
    // (They hold a nonce of their own, from registering another address.)
    const attacker = new Map<string, string>();
    await inBrowser(attacker, async () => {
      await redirectTarget(() =>
        register({ ...validRegistration, email: "attacker@example.com" }),
      );
      await resendVerificationAction(
        {},
        form({ email: "neighbour@example.com" }),
      );
    });
    await flush();
    const ownerMails = sent.filter((m) => m.to === "neighbour@example.com");
    expect(ownerMails).toHaveLength(2);
    const [ownerUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, "neighbour@example.com"));
    const [token] = await db
      .select()
      .from(authTokens)
      .where(eq(authTokens.userId, ownerUser?.id ?? ""));
    expect(token?.pendingPasswordHash).toBeNull();
    expect(token?.pendingNonceHash).toBeNull();

    // So the owner opening it, even in their own browser, chooses a password.
    const result = await verifyResult(tokenFrom(ownerMails[1]));
    expect(result.status).toBe("choose-password");
    expect(
      (await userByEmail("neighbour@example.com"))?.passwordHash,
    ).toBeNull();
  });

  it("registering an already verified address changes nothing and sends nothing", async () => {
    await db.insert(users).values(
      makeUser({
        email: "neighbour@example.com",
        emailVerified: new Date(),
        passwordHash: await hashPassword("whatever-pass"),
      }),
    );
    await redirectTarget(() => register());
    await flush();
    expect(sent).toHaveLength(0);
    expect(await db.select().from(authTokens)).toHaveLength(0);
    const row = await userByEmail("neighbour@example.com");
    expect(await verifyPassword("whatever-pass", row?.passwordHash ?? "")).toBe(
      true,
    );
  });

  it("does the same database and mail work after the response for every branch", async () => {
    // Nothing but validation, lookup and the redirect runs before the
    // response: the insert, token and SMTP send are deferred.
    const deferred: unknown[] = [];
    setRunAfterResponseForTests((work) => {
      deferred.push(work);
    });
    await redirectTarget(() => register());
    expect(deferred).toHaveLength(1);
    expect(await allUsers()).toHaveLength(0);
    expect(sent).toHaveLength(0);
    setRunAfterResponseForTests(runner);
  });

  it("registration after the deadline is rejected", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-12-07T10:00:00+01:00"));
    const state = await register();
    await flush();
    expect(state.error).toBe("closed");
    expect(await allUsers()).toHaveLength(0);
  });

  it("registration on the last day is accepted", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-12-06T22:00:00+01:00"));
    await redirectTarget(() => register());
    await flush();
    expect(await allUsers()).toHaveLength(1);
  });

  it("two registrations of one address within 60 seconds send one mail, and the first link still applies the password", async () => {
    await redirectTarget(() =>
      register({ ...validRegistration, password: "owner-password" }),
    );
    const again = await redirectTarget(() =>
      register({ ...validRegistration, password: "attacker-password" }),
    );
    await flush();
    expect(again).toBe("/check-email?email=neighbour%40example.com");
    expect(sent).toHaveLength(1);
    expect(await verifyResult(tokenFrom(sent[0]))).toEqual({
      status: "verified",
    });
    const row = await userByEmail("neighbour@example.com");
    expect(
      await verifyPassword("owner-password", row?.passwordHash ?? ""),
    ).toBe(true);
  });

  it("the 6th registration from one IP within a minute is refused and sends nothing", async () => {
    requestHeaders = new Headers({ "x-real-ip": "203.0.113.7" });
    for (let i = 0; i < 5; i++) {
      // oxlint-disable-next-line no-await-in-loop
      await redirectTarget(() =>
        register({ ...validRegistration, email: `n${i}@example.com` }),
      );
    }
    await flush();
    expect(sent).toHaveLength(5);
    const state = await register({
      ...validRegistration,
      email: "n5@example.com",
    });
    await flush();
    expect(state.error).toBe("rate");
    expect(sent).toHaveLength(5);
    // Another IP is not affected.
    requestHeaders = new Headers({ "x-real-ip": "203.0.113.8" });
    await redirectTarget(() =>
      register({ ...validRegistration, email: "n6@example.com" }),
    );
    await flush();
    expect(sent).toHaveLength(6);
  });

  it("stops sign-up mails for the day once the daily cap (minus the reset reserve) is reached", async () => {
    const { ACCOUNT_MAIL_DAILY_CAP, RESERVED_FOR_RESETS } =
      await import("@/features/account/mail-quota");
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-12-01T12:00:00+01:00"));
    await db.insert(sentEmails).values(
      Array.from(
        { length: ACCOUNT_MAIL_DAILY_CAP - RESERVED_FOR_RESETS - 1 },
        (_, i) => ({
          key: `account-mail:2026-12-01:seed-${i}`,
          sentAt: new Date(),
        }),
      ),
    );
    await redirectTarget(() =>
      register({ ...validRegistration, email: "last@example.com" }),
    );
    await flush();
    expect(sent).toHaveLength(1);
    const target = await redirectTarget(() =>
      register({ ...validRegistration, email: "over@example.com" }),
    );
    await flush();
    expect(target).toBe("/check-email?email=over%40example.com");
    expect(sent).toHaveLength(1);
    // A new Madrid day has a fresh quota.
    vi.setSystemTime(new Date("2026-12-02T00:05:00+01:00"));
    await redirectTarget(() =>
      register({ ...validRegistration, email: "next@example.com" }),
    );
    await flush();
    expect(sent).toHaveLength(2);
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
  const DAY = 24 * 3600_000;

  async function newUser(email = "v@example.com") {
    const [u] = await db.insert(users).values(makeUser({ email })).returning();
    if (!u) throw new Error("insert failed");
    return u;
  }

  it("verify token works once", async () => {
    const { issueToken } = await import("@/features/account/tokens");
    const user = await newUser();
    const token = await issueToken(user.id, "verify");
    expect(await verifyWith(token)).toBe(true);
    expect(await verifyWith(token)).toBe(false);
    const row = await userByEmail("v@example.com");
    expect(row?.emailVerified).toBeInstanceOf(Date);
  });

  it("a verify token older than 7 days is refused", async () => {
    const { issueToken } = await import("@/features/account/tokens");
    const user = await newUser();
    vi.useFakeTimers({ toFake: ["Date"] });
    const base = Date.now();
    const token = await issueToken(user.id, "verify");
    vi.setSystemTime(base + 7 * DAY + 1000);
    expect(await verifyWith(token)).toBe(false);
    expect((await userByEmail("v@example.com"))?.emailVerified).toBeNull();
  });

  it("a verify token just under 7 days old still works", async () => {
    const { issueToken } = await import("@/features/account/tokens");
    const user = await newUser();
    vi.useFakeTimers({ toFake: ["Date"] });
    const base = Date.now();
    const token = await issueToken(user.id, "verify");
    vi.setSystemTime(base + 7 * DAY - 1000);
    expect(await verifyWith(token)).toBe(true);
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
    await flush();
    expect(first.status).toBe("sent");
    expect(sent).toHaveLength(1);

    const second = await resendVerificationAction(
      {},
      form({ email: "v@example.com" }),
    );
    await flush();
    expect(second.status).toBe("wait");
    expect(second.retryAfter).toBeGreaterThan(0);
    expect(second.retryAfter).toBeLessThanOrEqual(60);
    expect(sent).toHaveLength(1);
  });

  it("registration starts the 60 second resend countdown", async () => {
    const { resendVerificationAction } =
      await import("@/features/account/resend-action");
    await redirectTarget(() => register());
    await flush();
    const res = await resendVerificationAction(
      {},
      form({ email: "neighbour@example.com" }),
    );
    await flush();
    expect(res.status).toBe("wait");
    expect(sent).toHaveLength(1);
  });

  it("resend keeps the registration data, so verifying still sets the registrant's password", async () => {
    const { resendVerificationAction } =
      await import("@/features/account/resend-action");
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-12-01T12:00:00+01:00"));
    await redirectTarget(() => register());
    await flush();
    vi.setSystemTime(new Date("2026-12-01T12:02:00+01:00"));
    const res = await resendVerificationAction(
      {},
      form({ email: "neighbour@example.com" }),
    );
    await flush();
    expect(res.status).toBe("sent");
    expect(sent).toHaveLength(2);
    expect(await verifyWith(tokenFrom(sent[0]))).toBe(false);
    expect(await verifyWith(tokenFrom(sent[1]))).toBe(true);
    const row = await userByEmail("neighbour@example.com");
    expect(await verifyPassword("correct horse", row?.passwordHash ?? "")).toBe(
      true,
    );
    expect(row?.consentAt).toBeInstanceOf(Date);
  });

  it("resend answers the same for an unknown email and sends nothing", async () => {
    const { resendVerificationAction } =
      await import("@/features/account/resend-action");
    const res = await resendVerificationAction(
      {},
      form({ email: "nobody@example.com" }),
    );
    await flush();
    expect(res.status).toBe("sent");
    expect(sent).toHaveLength(0);
  });
});

describe("sessions after a takeover-sensitive change", () => {
  async function sessionFor(email: string, sessionVersion: number) {
    const row = (await userByEmail(email))!;
    authMock.mockResolvedValue({
      user: { id: row.id, email },
      sessionVersion,
    });
  }

  it("verifying the email invalidates sessions issued before", async () => {
    const { requireAccount } = await import("@/features/auth/require-account");
    await redirectTarget(() => register());
    await flush();
    // The attacker holds a session from before the verification.
    await sessionFor("neighbour@example.com", 0);
    expect(await verifyWith(tokenFrom(sent[0]))).toBe(true);
    expect(await redirectTarget(() => requireAccount())).toBe("/signin");

    // A session stamped with the new version is fine.
    const row = await userByEmail("neighbour@example.com");
    await sessionFor("neighbour@example.com", row?.sessionVersion ?? -1);
    await expect(requireAccount()).resolves.toMatchObject({ id: row?.id });
  });

  it("a password reset invalidates sessions issued before", async () => {
    const { requireAccount } = await import("@/features/auth/require-account");
    const { resetPasswordAction } =
      await import("@/features/account/reset-password-action");
    const { issueToken } = await import("@/features/account/tokens");
    const [u] = await db
      .insert(users)
      .values(
        makeUser({
          email: "s@example.com",
          emailVerified: new Date(),
          consentAt: new Date(),
          passwordHash: await hashPassword("old-password"),
        }),
      )
      .returning();
    await sessionFor("s@example.com", 0);
    await expect(requireAccount()).resolves.toMatchObject({ id: u?.id });

    const token = await issueToken(u?.id ?? "", "reset");
    await resetPasswordAction(
      {},
      form({ token, password: "brand-new-pass", confirm: "brand-new-pass" }),
    );
    expect(await redirectTarget(() => requireAccount())).toBe("/signin");
  });

  it("a Google takeover invalidates sessions and clears consent of an unverified account", async () => {
    const { requireAccount } = await import("@/features/auth/require-account");
    const { googleSignInAllowed } = await import("@/lib/auth-events");
    const [u] = await db
      .insert(users)
      .values(
        makeUser({
          email: "t@example.com",
          passwordHash: await hashPassword("attacker-pw-1"),
          consentVersion: "2026-10-31",
          consentAt: new Date(),
        }),
      )
      .returning();
    await sessionFor("t@example.com", 0);

    expect(
      await googleSignInAllowed(
        "t@example.com",
        true,
        new Date("2026-12-01T12:00:00+01:00"),
      ),
    ).toBe(true);

    const row = await userByEmail("t@example.com");
    expect(row).toMatchObject({
      passwordHash: null,
      consentAt: null,
      consentVersion: null,
      sessionVersion: 1,
    });
    expect(await redirectTarget(() => requireAccount())).toBe("/signin");
    // The owner arrives with a fresh session and has to consent first.
    await sessionFor("t@example.com", 1);
    expect(await redirectTarget(() => requireAccount())).toBe("/welcome");
    expect(row?.id).toBe(u?.id);
  });

  it("a Google takeover also kills the pending verify link of the registrant", async () => {
    const { googleSignInAllowed } = await import("@/lib/auth-events");
    await redirectTarget(() =>
      register({ ...validRegistration, password: "attacker-password" }),
    );
    await flush();
    await googleSignInAllowed(
      "neighbour@example.com",
      true,
      new Date("2026-12-01T12:00:00+01:00"),
    );
    // The mail the victim got from the attacker's registration does nothing.
    expect(await verifyWith(tokenFrom(sent[0]))).toBe(false);
    const row = await userByEmail("neighbour@example.com");
    expect(row?.passwordHash).toBeNull();
  });

  it("a stale JWT cannot give consent: acceptConsentAction sends it to /signin and writes nothing", async () => {
    const { acceptConsentAction } =
      await import("@/features/account/accept-consent-action");
    const [u] = await db
      .insert(users)
      .values({
        ...makeUser({ email: "stale@example.com" }),
        sessionVersion: 2,
      })
      .returning();
    authMock.mockResolvedValue({ user: { id: u?.id }, sessionVersion: 1 });

    expect(
      await redirectTarget(() =>
        acceptConsentAction(
          {},
          form({ locale: "es", consent: "on", age14: "on" }),
        ),
      ),
    ).toBe("/signin");
    const row = await userByEmail("stale@example.com");
    expect(row?.consentAt).toBeNull();
    expect(row?.locale).toBe("en");
  });

  it("a stale JWT is a guest for setLocaleAction: cookie only, users.locale untouched", async () => {
    const { setLocaleAction } =
      await import("@/features/game/set-locale-action");
    const [u] = await db
      .insert(users)
      .values({
        ...makeUser({ email: "stale2@example.com" }),
        sessionVersion: 2,
      })
      .returning();
    authMock.mockResolvedValue({ user: { id: u?.id }, sessionVersion: 1 });

    await setLocaleAction(form({ locale: "de" }));
    expect(cookieStore.get("locale")).toBe("de");
    expect((await userByEmail("stale2@example.com"))?.locale).toBe("en");
  });

  it("stamps the session version on the JWT at sign-in", async () => {
    const { currentSessionVersion } = await import("@/lib/auth-events");
    const [u] = await db
      .insert(users)
      .values({ ...makeUser(), sessionVersion: 3 })
      .returning();
    expect(await currentSessionVersion(u?.id ?? "")).toBe(3);
  });

  it("only google and credentials may sign in", async () => {
    const { signInPolicy } = await import("@/lib/auth-events");
    expect(await signInPolicy("credentials", "a@b.co", undefined)).toBe(true);
    expect(await signInPolicy("github", "a@b.co", true)).toBe(false);
    expect(await signInPolicy(undefined, "a@b.co", true)).toBe(false);
    expect(await signInPolicy("google", "a@b.co", true)).toBe(true); // registration is open by default
  });
});

describe("password reset", () => {
  const MINUTE = 60_000;

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

  const newPassword = (token: string) =>
    form({ token, password: "brand-new-pass", confirm: "brand-new-pass" });

  it("a reset link changes the password, signs in, and works only once", async () => {
    const { resetPasswordAction } =
      await import("@/features/account/reset-password-action");
    const { issueToken } = await import("@/features/account/tokens");
    const user = await userWithPassword();

    const token = await issueToken(user.id, "reset");
    expect(await resetPasswordAction({}, newPassword(token))).toEqual({});
    expect(signInMock).toHaveBeenCalledWith(
      "credentials",
      expect.objectContaining({
        email: "r@example.com",
        password: "brand-new-pass",
      }),
    );
    const row = await userByEmail("r@example.com");
    expect(
      await verifyPassword("brand-new-pass", row?.passwordHash ?? ""),
    ).toBe(true);
    expect(await verifyPassword("old-password", row?.passwordHash ?? "")).toBe(
      false,
    );
    expect(row?.emailVerified).toBeInstanceOf(Date);

    expect(await resetPasswordAction({}, newPassword(token))).toEqual({
      error: "expired",
    });
  });

  it("a reset link older than 1 hour is refused and the password stays", async () => {
    const { resetPasswordAction } =
      await import("@/features/account/reset-password-action");
    const { issueToken } = await import("@/features/account/tokens");
    const user = await userWithPassword();
    vi.useFakeTimers({ toFake: ["Date"] });
    const base = Date.now();
    const token = await issueToken(user.id, "reset");
    vi.setSystemTime(base + 60 * MINUTE + 1000);

    expect(await resetPasswordAction({}, newPassword(token))).toEqual({
      error: "expired",
    });
    const row = await userByEmail("r@example.com");
    expect(await verifyPassword("old-password", row?.passwordHash ?? "")).toBe(
      true,
    );
  });

  it("a reset link just under 1 hour old still works", async () => {
    const { resetPasswordAction } =
      await import("@/features/account/reset-password-action");
    const { issueToken } = await import("@/features/account/tokens");
    const user = await userWithPassword();
    vi.useFakeTimers({ toFake: ["Date"] });
    const base = Date.now();
    const token = await issueToken(user.id, "reset");
    vi.setSystemTime(base + 60 * MINUTE - 1000);

    expect(await resetPasswordAction({}, newPassword(token))).toEqual({});
  });

  it("a reset also kills a pending registration link, so it cannot overwrite the new password", async () => {
    const { resetPasswordAction } =
      await import("@/features/account/reset-password-action");
    const { forgotPasswordAction } =
      await import("@/features/account/forgot-password-action");
    await redirectTarget(() =>
      register({ ...validRegistration, password: "attacker-password" }),
    );
    await flush();
    const registrationMail = sent[0];
    await forgotPasswordAction({}, form({ email: "neighbour@example.com" }));
    await flush();
    const resetMail = sent[1];

    expect(
      await resetPasswordAction({}, newPassword(tokenFrom(resetMail))),
    ).toEqual({});
    expect(await verifyWith(tokenFrom(registrationMail))).toBe(false);
    const row = await userByEmail("neighbour@example.com");
    expect(
      await verifyPassword("brand-new-pass", row?.passwordHash ?? ""),
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
    expect(await resetPasswordAction({}, newPassword(token))).toEqual({});
  });

  it("forgot password answers the same for an unknown email", async () => {
    const { forgotPasswordAction } =
      await import("@/features/account/forgot-password-action");
    await userWithPassword();

    const known = await forgotPasswordAction(
      {},
      form({ email: "r@example.com" }),
    );
    await flush();
    expect(sent).toHaveLength(1);
    expect(sent[0]?.text).toContain("/reset-password?token=");
    const unknown = await forgotPasswordAction(
      {},
      form({ email: "nobody@example.com" }),
    );
    await flush();
    expect(sent).toHaveLength(1);

    expect(known).toEqual({ status: "sent", email: "r@example.com" });
    expect(unknown).toEqual({ status: "sent", email: "nobody@example.com" });
  });

  it("forgot password sends one mail per address per 60 seconds and answers the same", async () => {
    const { forgotPasswordAction } =
      await import("@/features/account/forgot-password-action");
    await userWithPassword();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-12-01T12:00:00+01:00"));
    const first = await forgotPasswordAction(
      {},
      form({ email: "r@example.com" }),
    );
    const second = await forgotPasswordAction(
      {},
      form({ email: "r@example.com" }),
    );
    await flush();
    expect(second).toEqual(first);
    expect(sent).toHaveLength(1);
    vi.setSystemTime(new Date("2026-12-01T12:01:01+01:00"));
    await forgotPasswordAction({}, form({ email: "r@example.com" }));
    await flush();
    expect(sent).toHaveLength(2);
  });

  it("keeps the end of the daily cap for resets of verified accounts", async () => {
    const { ACCOUNT_MAIL_DAILY_CAP, RESERVED_FOR_RESETS } =
      await import("@/features/account/mail-quota");
    const { forgotPasswordAction } =
      await import("@/features/account/forgot-password-action");
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-12-01T12:00:00+01:00"));
    await userWithPassword(); // r@example.com, unverified
    await db.insert(users).values(
      makeUser({
        email: "in-game@example.com",
        emailVerified: new Date(),
        passwordHash: await hashPassword("old-password"),
      }),
    );
    // Sign-ups used everything but the reserve.
    await db.insert(sentEmails).values(
      Array.from(
        { length: ACCOUNT_MAIL_DAILY_CAP - RESERVED_FOR_RESETS },
        (_, i) => ({
          key: `account-mail:2026-12-01:seed-${i}`,
          sentAt: new Date(),
        }),
      ),
    );
    await redirectTarget(() =>
      register({ ...validRegistration, email: "late@example.com" }),
    );
    await forgotPasswordAction({}, form({ email: "r@example.com" }));
    await flush();
    expect(sent).toHaveLength(0);

    await forgotPasswordAction({}, form({ email: "in-game@example.com" }));
    await flush();
    expect(sent.map((m) => m.to)).toEqual(["in-game@example.com"]);
  });

  it("limits forgot password to 5 per minute per IP", async () => {
    const { forgotPasswordAction } =
      await import("@/features/account/forgot-password-action");
    requestHeaders = new Headers({
      "x-forwarded-for": "198.51.100.4, 10.0.0.1",
    });
    for (let i = 0; i < 5; i++) {
      // oxlint-disable-next-line no-await-in-loop
      await forgotPasswordAction({}, form({ email: `f${i}@example.com` }));
    }
    const sixth = await forgotPasswordAction(
      {},
      form({ email: "f5@example.com" }),
    );
    expect(sixth.status).toBe("rate");
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

  it("the organizer may sign up with Google or email after the deadline", async () => {
    const { googleSignInAllowed } = await import("@/lib/auth-events");
    const after = new Date("2026-12-20T12:00:00+01:00");
    expect(await googleSignInAllowed("Kate@Example.dev", true, after)).toBe(
      true,
    );
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(after);
    const target = await redirectTarget(() =>
      register({ ...validRegistration, email: "kate@example.dev" }),
    );
    await flush();
    expect(target).toBe("/check-email?email=kate%40example.dev");
    expect(sent.map((m) => m.to)).toEqual(["kate@example.dev"]);
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

    authMock.mockResolvedValue({
      user: { id: row?.id },
      sessionVersion: row?.sessionVersion,
    });
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
      sessionVersion: 0,
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
