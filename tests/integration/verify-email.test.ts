import { eq } from "drizzle-orm";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { authTokens, users } from "@/db/schema";
import { makeUser } from "@/db/factories";
import { hashPassword, verifyPassword } from "@/lib/password";
import { createTestDb, type TestDb } from "./helpers/test-db";

let db: TestDb;
let cleanup: () => Promise<void>;
const cookieStore = new Map<string, string>();

vi.mock("@/db/client", () => ({ getDb: () => db }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    set: (name: string, value: string) => cookieStore.set(name, value),
    get: (name: string) =>
      cookieStore.has(name) ? { value: cookieStore.get(name) } : undefined,
  }),
  headers: async () => new Headers(),
}));
vi.mock("next-intl/server", () => ({
  getTranslations: async (ns: string) => (key: string) => `${ns}.${key}`,
}));
vi.mock("@/lib/auth", () => ({ auth: async () => null, signIn: vi.fn() }));

beforeAll(async () => {
  ({ db, cleanup } = await createTestDb());
});
afterAll(async () => {
  await cleanup();
});
beforeEach(async () => {
  cookieStore.clear();
  await db.delete(authTokens);
  await db.delete(users);
});

/** A registration made in this browser: token with pending data + nonce cookie. */
async function registration() {
  const { issueToken, hashNonce } = await import("@/features/account/tokens");
  const [user] = await db
    .insert(users)
    .values(makeUser({ email: "n@example.com" }))
    .returning();
  if (!user) throw new Error("insert failed");
  cookieStore.set("reg_nonce", "browser-nonce");
  const token = await issueToken(user.id, "verify", {
    passwordHash: await hashPassword("chosen-password"),
    locale: "uk",
    consentVersion: "2026-10-31",
    consentAt: new Date(),
    nonceHash: hashNonce("browser-nonce"),
  });
  return { user, token };
}

async function openPage(token?: string) {
  const { default: VerifyEmail } =
    await import("@/app/(site)/verify-email/page");
  const element = await VerifyEmail({
    searchParams: Promise.resolve(token ? { token } : {}),
  });
  return JSON.stringify(element);
}

async function confirm(token: string): Promise<string> {
  const { confirmEmailAction } =
    await import("@/features/account/confirm-email-action");
  const data = new FormData();
  data.set("token", token);
  const error: unknown = await confirmEmailAction(data).then(
    () => undefined,
    (e: unknown) => e,
  );
  const digest = (error as { digest?: string } | undefined)?.digest ?? "";
  if (!digest.startsWith("NEXT_REDIRECT")) throw new Error("no redirect");
  return digest.split(";")[2] ?? "";
}

async function row(id: string) {
  const [u] = await db.select().from(users).where(eq(users.id, id));
  return u;
}

describe("verify link", () => {
  it("opening the link (GET, e.g. a mail scanner) only shows the button and spends nothing", async () => {
    const { user, token } = await registration();
    const page = await openPage(token);
    expect(page).toContain("account.verifyConfirm.submit");
    expect(page).toContain(`"value":"${token}"`);
    const [stored] = await db.select().from(authTokens);
    expect(stored?.usedAt).toBeNull();
    expect((await row(user.id))?.emailVerified).toBeNull();
    // Opening it again still shows the button.
    expect(await openPage(token)).toContain("account.verifyConfirm.submit");
  });

  it("pressing the button in the registering browser verifies and applies the password", async () => {
    const { user, token } = await registration();
    expect(await confirm(token)).toBe("/verify-email?confirmed=1");
    const after = await row(user.id);
    expect(after?.emailVerified).toBeInstanceOf(Date);
    expect(
      await verifyPassword("chosen-password", after?.passwordHash ?? ""),
    ).toBe(true);
    expect(await openPage(token)).toContain("account.verifyExpired.title");
  });

  it("pressing the button in another browser leads to choosing a password", async () => {
    const { user, token } = await registration();
    cookieStore.clear();
    expect(await confirm(token)).toMatch(/^\/reset-password\?token=/);
    expect((await row(user.id))?.passwordHash).toBeNull();
  });

  it("a spent or unknown link shows the expired page with the new-password hint", async () => {
    expect(await confirm("not-a-token")).toBe("/verify-email");
    const page = await openPage("not-a-token");
    expect(page).toContain("account.verifyExpired.title");
    expect(page).toContain("account.verifyExpired.newPassword");
    expect(page).toContain('"href":"/forgot-password"');
    expect(page).not.toContain("account.verifyConfirm.submit");
  });
});
