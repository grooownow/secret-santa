import { eq } from "drizzle-orm";
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
import { makeParticipant, makeUser } from "@/db/factories";
import { participants, translations, users, wallPosts } from "@/db/schema";
import {
  deleteAllTranslations,
  getLocalized,
  retryMissingTranslations,
  setTranslatorForTests,
  translateAndStore,
  type Translator,
} from "@/features/translation";
import { LOCALES, type Locale } from "@/i18n/locale";
import { setRunAfterResponseForTests } from "@/lib/run-after-response";
import { createTestDb, type TestDb } from "./helpers/test-db";

let db: TestDb;
let cleanup: () => Promise<void>;
const authMock = vi.fn();

vi.mock("@/db/client", () => ({ getDb: () => db }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ set: vi.fn(), get: vi.fn() }),
  headers: async () => new Headers(),
}));
vi.mock("@/lib/auth", () => ({
  auth: () => authMock(),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

const deferred: Promise<unknown>[] = [];
async function flush() {
  while (deferred.length) {
    // oxlint-disable-next-line no-await-in-loop
    await deferred.shift();
  }
}

const calls: { text: string; from: string; to: Locale[] }[] = [];
let failing = false;
const translator: Translator = {
  async translate(text, from, to) {
    calls.push({ text, from, to });
    if (failing) throw new Error("groq is down");
    return Object.fromEntries(to.map((l) => [l, `[${l}] ${text}`]));
  },
};

beforeAll(async () => {
  ({ db, cleanup } = await createTestDb());
  setRunAfterResponseForTests((work) => {
    deferred.push(Promise.resolve().then(work));
  });
});
afterAll(async () => {
  setRunAfterResponseForTests(null);
  await cleanup();
});
beforeEach(async () => {
  calls.length = 0;
  failing = false;
  setTranslatorForTests(translator);
  authMock.mockReset();
  await db.delete(translations);
  await db.delete(wallPosts);
  await db.delete(participants);
  await db.delete(users);
});
afterEach(() => setTranslatorForTests(null));

async function signedInUser(locale: Locale = "ru") {
  const [user] = await db
    .insert(users)
    .values(
      makeUser({
        emailVerified: new Date(),
        consentAt: new Date(),
        locale,
      }),
    )
    .returning();
  if (!user) throw new Error("no user");
  authMock.mockResolvedValue({
    user: { id: user.id, email: user.email },
    sessionVersion: user.sessionVersion,
  });
  return user;
}

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
}

const fields = {
  name: "Anna Secretname",
  building: "K",
  apartment: "24",
  wishes: "books",
  avoid: "nuts",
};

async function saveAdult(extra: Record<string, string> = {}) {
  const { saveAdultAction } =
    await import("@/features/profile/save-adult-action");
  const result = await saveAdultAction({}, form({ ...fields, ...extra })).then(
    () => undefined,
    (e: unknown) => e,
  );
  // a successful save ends in a redirect
  expect((result as { digest?: string } | undefined)?.digest).toMatch(
    /^NEXT_REDIRECT/,
  );
  await flush();
}

async function ownParticipant(userId: string) {
  const [row] = await db
    .select()
    .from(participants)
    .where(eq(participants.userId, userId));
  if (!row) throw new Error("no participant");
  return row;
}

describe("auto-translation", () => {
  it("saving wishes stores translations for the 4 other locales", async () => {
    const user = await signedInUser("ru");
    await saveAdult();
    const p = await ownParticipant(user.id);

    const map = await getLocalized([`participant:${p.id}:wishes`], "de");
    expect(map.get(`participant:${p.id}:wishes`)).toBe("[de] books");
    const rows = await db
      .select()
      .from(translations)
      .where(eq(translations.sourceKey, `participant:${p.id}:wishes`));
    expect(rows.map((r) => r.locale).sort()).toEqual(
      LOCALES.filter((l) => l !== "ru").sort(),
    );
  });

  it("text in the author's own locale has no translation", async () => {
    const user = await signedInUser("ru");
    await saveAdult();
    const p = await ownParticipant(user.id);
    const map = await getLocalized([`participant:${p.id}:wishes`], "ru");
    expect(map.get(`participant:${p.id}:wishes`)).toBeNull();
  });

  it("editing the text replaces old translations", async () => {
    const user = await signedInUser("ru");
    await saveAdult();
    const p = await ownParticipant(user.id);
    await saveAdult({ wishes: "tea" });

    const map = await getLocalized([`participant:${p.id}:wishes`], "en");
    expect(map.get(`participant:${p.id}:wishes`)).toBe("[en] tea");
    // the unchanged field was not translated again
    expect(calls.filter((c) => c.text === "nuts")).toHaveLength(1);
  });

  it("clearing a text removes its translations", async () => {
    const user = await signedInUser("ru");
    await saveAdult();
    const p = await ownParticipant(user.id);
    await saveAdult({ wishes: "" });
    const map = await getLocalized([`participant:${p.id}:wishes`], "en");
    expect(map.get(`participant:${p.id}:wishes`)).toBeNull();
  });

  it("a translator failure saves the profile anyway and leaves the translation missing", async () => {
    failing = true;
    const user = await signedInUser("ru");
    await saveAdult();
    const p = await ownParticipant(user.id);
    expect(p.wishes).toBe("books");
    const map = await getLocalized([`participant:${p.id}:wishes`], "en");
    expect(map.get(`participant:${p.id}:wishes`)).toBeNull();
  });

  it("retryMissingTranslations fills the gaps and is idempotent", async () => {
    failing = true;
    const user = await signedInUser("ru");
    await saveAdult();
    const p = await ownParticipant(user.id);
    failing = false;
    calls.length = 0;

    expect(await retryMissingTranslations()).toEqual({ done: 2, failed: 0 });
    const key = `participant:${p.id}:wishes`;
    expect((await getLocalized([key], "es")).get(key)).toBe("[es] books");
    const callsAfterFirst = calls.length;

    expect(await retryMissingTranslations()).toEqual({ done: 0, failed: 0 });
    expect(calls).toHaveLength(callsAfterFirst);
  });

  it("retryMissingTranslations is bounded and counts failures", async () => {
    const user = await signedInUser("en");
    await db.insert(participants).values(
      [0, 1, 2].map((i) =>
        makeParticipant(user.id, {
          kind: "child",
          name: `c${i}`,
          wishes: `w${i}`,
        }),
      ),
    );
    expect(await retryMissingTranslations(2)).toEqual({ done: 2, failed: 0 });
    failing = true;
    expect(await retryMissingTranslations(10)).toEqual({ done: 0, failed: 1 });
  });

  it("translates wall posts under post:<id> and sends only the text", async () => {
    const user = await signedInUser("uk");
    await saveAdult();
    const p = await ownParticipant(user.id);
    const [post] = await db
      .insert(wallPosts)
      .values({ participantId: p.id, text: "Happy holidays" })
      .returning();
    calls.length = 0;
    await translateAndStore(`post:${post?.id}`, "Happy holidays", "uk");

    expect(calls).toHaveLength(1);
    expect(calls[0]?.text).toBe("Happy holidays");
    expect(calls[0]?.to.sort()).toEqual(["de", "en", "es", "ru"]);
    const map = await getLocalized([`post:${post?.id}`], "ru");
    expect(map.get(`post:${post?.id}`)).toBe("[ru] Happy holidays");
  });

  it("the text sent to the translator has no name, building or apartment", async () => {
    await signedInUser("ru");
    await saveAdult();
    expect(calls.length).toBeGreaterThan(0);
    for (const call of calls) {
      expect(["books", "nuts"]).toContain(call.text);
      expect(JSON.stringify(call)).not.toMatch(/Secretname|Anna|"K"|24/);
    }
  });

  it("a stale in-flight result is discarded after the text was edited", async () => {
    const user = await signedInUser("ru");
    await saveAdult();
    const p = await ownParticipant(user.id);
    const key = `participant:${p.id}:wishes`;
    // The text changes while the translation of the old text is running.
    setTranslatorForTests({
      async translate(text, _from, to) {
        await db
          .update(participants)
          .set({ wishes: "newer" })
          .where(eq(participants.id, p.id));
        return Object.fromEntries(to.map((l) => [l, `[${l}] ${text}`]));
      },
    });
    await db.delete(translations);
    await translateAndStore(key, "books", "ru");
    expect((await getLocalized([key], "en")).get(key)).toBeNull();
  });

  it("deleting a participant removes their translations", async () => {
    const user = await signedInUser("ru");
    await saveAdult();
    const p = await ownParticipant(user.id);
    const [post] = await db
      .insert(wallPosts)
      .values({ participantId: p.id, text: "hi" })
      .returning();
    await translateAndStore(`post:${post?.id}`, "hi", "ru");
    expect(await db.select().from(translations)).not.toHaveLength(0);

    const { deleteParticipantAction } =
      await import("@/features/profile/delete-participant-action");
    await deleteParticipantAction({}, form({ id: p.id })).catch(() => {});
    expect(await db.select().from(translations)).toHaveLength(0);
  });

  it("deleteAllTranslations purges everything", async () => {
    await signedInUser("ru");
    await saveAdult();
    await deleteAllTranslations();
    expect(await db.select().from(translations)).toHaveLength(0);
  });
});
