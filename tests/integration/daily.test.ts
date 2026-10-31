import { eq } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
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
import {
  accounts,
  assignments,
  authTokens,
  guesses,
  participants,
  sentEmails,
  settings,
  translationAttempts,
  translations,
  users,
  wallPosts,
} from "@/db/schema";
import { runDaily, purgeAll } from "@/features/game";
import { setMailTransportForTests, type MailMessage } from "@/features/mail";
import { DEFAULT_DATES } from "@/lib/game-phase";
import { createTestDb, type TestDb } from "./helpers/test-db";

let db: TestDb;
let cleanup: () => Promise<void>;
const deletePhotosMock = vi.fn(async (_urls: string[]) => {});
const env = vi.hoisted(() => ({
  CRON_SECRET: "s3cret" as string | undefined,
  NODE_ENV: "test",
}));

vi.mock("@/db/client", () => ({ getDb: () => db }));
vi.mock("@/lib/photo-storage", () => ({
  deletePhotos: (urls: string[]) => deletePhotosMock(urls),
}));
vi.mock("@/lib/env", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/env")>();
  return {
    ...actual,
    env: new Proxy(actual.env, {
      get: (target, key) =>
        key in env
          ? env[key as keyof typeof env]
          : target[key as keyof typeof target],
    }),
  };
});

beforeAll(async () => {
  ({ db, cleanup } = await createTestDb());
});
afterAll(async () => {
  await cleanup();
});

const outbox: MailMessage[] = [];

async function reset() {
  await db.delete(wallPosts);
  await db.delete(guesses);
  await db.delete(assignments);
  await db.delete(authTokens);
  await db.delete(sentEmails);
  await db.delete(translations);
  await db.delete(translationAttempts);
  await db.delete(participants);
  await db.delete(accounts);
  await db.delete(users);
  await db.delete(settings);
  await db.insert(settings).values({ id: 1, ...DEFAULT_DATES });
}

beforeEach(async () => {
  outbox.length = 0;
  deletePhotosMock.mockReset();
  deletePhotosMock.mockResolvedValue(undefined);
  env.CRON_SECRET = "s3cret";
  env.NODE_ENV = "test";
  setMailTransportForTests(async (m) => {
    outbox.push(m);
  });
  await reset();
});
afterEach(() => setMailTransportForTests(null));

/** Madrid noon on the given day, so the date is unambiguous. */
const at = (day: string) => new Date(`${day}T11:00:00Z`);

async function seedDraw(opts: { drawn?: boolean; left?: boolean } = {}) {
  const urls = ["https://blob.example/a.jpg", "data:image/png;base64,AAA"];
  const ids: string[] = [];
  for (const [i, url] of urls.entries()) {
    const [u] = await db.insert(users).values(makeUser()).returning();
    const [p] = await db
      .insert(participants)
      .values(makeParticipant(u!.id, { name: `P${i}`, photoUrl: url }))
      .returning();
    await db.insert(accounts).values({
      userId: u!.id,
      type: "oauth",
      provider: "google",
      providerAccountId: `g${i}`,
    });
    await db.insert(authTokens).values({
      tokenHash: `h${i}`,
      userId: u!.id,
      purpose: "verify",
      expiresAt: new Date(),
    });
    ids.push(p!.id);
  }
  await db.insert(assignments).values([
    {
      receiverId: ids[1]!,
      giverId: ids[0]!,
      giftLeftAt: opts.left ? new Date() : null,
    },
    { receiverId: ids[0]!, giverId: ids[1]! },
  ]);
  await db
    .insert(guesses)
    .values({ participantId: ids[0]!, guessedId: ids[1]! });
  await db.insert(wallPosts).values({
    participantId: ids[0]!,
    text: "hi",
    photoUrl: "https://blob.example/w.jpg",
  });
  await db.insert(translations).values({
    sourceKey: "post:x",
    locale: "en",
    text: "t",
    sourceHash: "h",
  });
  await db.insert(translationAttempts).values({ sourceKey: "post:x" });
  await db.insert(sentEmails).values({ key: "draw:u" });
  if (opts.drawn !== false) {
    await db
      .update(settings)
      .set({ drawnAt: new Date("2026-12-07T09:00:00Z") });
  }
  return ids;
}

const count = async (table: PgTable) => (await db.select().from(table)).length;

describe("cron route", () => {
  async function call(auth?: string) {
    const { GET } = await import("@/app/api/cron/daily/route");
    return GET(
      new Request("http://x/api/cron/daily", {
        headers: auth ? { authorization: auth } : {},
      }),
    );
  }

  it("without the secret gets 401", async () => {
    expect((await call()).status).toBe(401);
    expect((await call("Bearer wrong")).status).toBe(401);
  });

  it("refuses to run in production when CRON_SECRET is unset", async () => {
    env.CRON_SECRET = undefined;
    env.NODE_ENV = "production";
    expect((await call()).status).toBe(401);
    expect((await call("Bearer undefined")).status).toBe(401);
  });

  it("runs with the right secret", async () => {
    const res = await call("Bearer s3cret");
    expect(res.status).toBe(200);
    expect((await res.json()).purge).toBe("skipped");
  });
});

describe("runDaily", () => {
  it("Dec 25 sends gifts-open, Dec 29 the reminder, Jan 1 the reveal", async () => {
    await seedDraw();
    expect(Object.keys((await runDaily(at("2026-12-24"))).broadcasts)).toEqual(
      [],
    );

    const dec25 = await runDaily(at("2026-12-25"));
    expect(dec25.broadcasts["gifts-open"]).toMatchObject({ total: 2, sent: 2 });
    expect(dec25.broadcasts.reminder).toBeUndefined();

    outbox.length = 0;
    const dec29 = await runDaily(at("2026-12-29"));
    expect(dec29.broadcasts.reminder).toMatchObject({ total: 2, sent: 2 });
    // gifts-open already sent: the rerun on a later day sends nothing new.
    expect(dec29.broadcasts["gifts-open"]).toMatchObject({ sent: 0 });
    expect(outbox).toHaveLength(2);

    outbox.length = 0;
    const jan1 = await runDaily(at("2027-01-01"));
    expect(jan1.broadcasts.reveal).toMatchObject({ total: 2, sent: 2 });
    expect(jan1.broadcasts["gifts-open"]).toBeUndefined();
    expect(jan1.broadcasts.reminder).toBeUndefined();
    expect(outbox).toHaveLength(2);
  });

  it("the reminder skips gifts already left", async () => {
    await seedDraw({ left: true });
    const r = await runDaily(at("2026-12-29"));
    expect(r.broadcasts.reminder).toMatchObject({ total: 1, sent: 1 });
  });

  it("a repeated run the same day sends nothing new", async () => {
    await seedDraw();
    await runDaily(at("2026-12-25"));
    outbox.length = 0;
    const again = await runDaily(at("2026-12-25"));
    expect(again.broadcasts["gifts-open"]).toMatchObject({ total: 2, sent: 0 });
    expect(outbox).toHaveLength(0);
  });

  it("nothing is sent before the draw", async () => {
    await seedDraw({ drawn: false });
    const r = await runDaily(at("2026-12-25"));
    expect(r.broadcasts).toEqual({});
    expect(outbox).toHaveLength(0);
  });

  it("honours dates moved by the organizer", async () => {
    await seedDraw();
    await db
      .update(settings)
      .set({ giftsStartOn: "2026-12-20", giftsEndOn: "2026-12-24" });
    expect(
      (await runDaily(at("2026-12-20"))).broadcasts["gifts-open"]?.sent,
    ).toBe(2);
    expect((await runDaily(at("2026-12-22"))).broadcasts.reminder?.sent).toBe(
      2,
    );
  });

  it("reports failed sends so the route answers 500", async () => {
    await seedDraw();
    setMailTransportForTests(async () => {
      throw new Error("gmail down");
    });
    const r = await runDaily(at("2026-12-25"));
    expect(r.failed).toBe(true);
    expect(r.broadcasts["gifts-open"]).toMatchObject({ sent: 0, failed: 2 });
  });
});

describe("purge", () => {
  it("Jan 10 deletes users, participants, assignments, posts and photos", async () => {
    await seedDraw();
    const r = await runDaily(at("2027-01-10"));
    expect(r.purge).toBe("purged");
    for (const table of [
      users,
      accounts,
      participants,
      assignments,
      guesses,
      wallPosts,
      authTokens,
      sentEmails,
      translations,
      translationAttempts,
    ]) {
      expect(await count(table)).toBe(0);
    }
    expect(deletePhotosMock).toHaveBeenCalledOnce();
    expect(deletePhotosMock.mock.calls[0]![0].sort()).toEqual([
      "data:image/png;base64,AAA",
      "https://blob.example/a.jpg",
      "https://blob.example/w.jpg",
    ]);
    expect(outbox).toHaveLength(0);
  });

  it("keeps the settings row and sets purgedAt", async () => {
    await seedDraw();
    await purgeAll(at("2027-01-10"));
    const [row] = await db.select().from(settings);
    expect(row?.purgedAt).toBeInstanceOf(Date);
    expect(row?.closeOn).toBe("2027-01-10");
    expect(await purgeAll(at("2027-01-11"))).toBe("skipped");
  });

  it("a failed blob delete leaves purgedAt empty so the next day retries", async () => {
    await seedDraw();
    deletePhotosMock.mockRejectedValueOnce(new Error("blob down"));
    const first = await runDaily(at("2027-01-10"));
    expect(first.purge).toBe("failed");
    expect(first.failed).toBe(true);
    expect((await db.select().from(settings))[0]?.purgedAt).toBeNull();
    expect(await count(participants)).toBe(2);

    const second = await runDaily(at("2027-01-11"));
    expect(second.purge).toBe("purged");
    expect(await count(participants)).toBe(0);
    expect(deletePhotosMock.mock.calls[1]![0]).toContain(
      "https://blob.example/a.jpg",
    );
  });

  it("does nothing if the close date was moved later", async () => {
    await seedDraw();
    await db.update(settings).set({ closeOn: "2027-01-20" });
    const r = await runDaily(at("2027-01-10"));
    expect(r.purge).toBe("skipped");
    expect(await count(participants)).toBe(2);
    expect(deletePhotosMock).not.toHaveBeenCalled();
    expect(
      (await db.select().from(settings).where(eq(settings.id, 1)))[0]?.purgedAt,
    ).toBeNull();
  });
});
