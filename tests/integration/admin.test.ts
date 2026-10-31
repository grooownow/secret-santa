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
import {
  assignments,
  participants,
  sentEmails,
  settings,
  translations,
  users,
  wallPosts,
} from "@/db/schema";
import { setMailTransportForTests, type MailMessage } from "@/features/mail";
import { DEFAULT_DATES } from "@/lib/game-phase";
import { createTestDb, type TestDb } from "./helpers/test-db";

let db: TestDb;
let cleanup: () => Promise<void>;
const authMock = vi.fn();
const ORGANIZER_EMAIL = "kate@example.dev";

vi.mock("@/db/client", () => ({ getDb: () => db }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ set: vi.fn(), get: vi.fn() }),
  headers: async () => new Headers(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`NEXT_REDIRECT:${to}`);
  },
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
vi.mock("@/lib/auth", () => ({
  auth: () => authMock(),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock("@/lib/env", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/env")>();
  return { env: { ...original.env, ADMIN_EMAIL: "kate@example.dev" } };
});

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
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-12-10T12:00:00+01:00"));
  sent.length = 0;
  authMock.mockReset();
  await db.delete(sentEmails);
  await db.delete(translations);
  await db.delete(wallPosts);
  await db.delete(assignments);
  await db.delete(participants);
  await db.delete(users);
  await db.delete(settings);
  await db.insert(settings).values({
    id: 1,
    ...DEFAULT_DATES,
    drawnAt: new Date("2026-12-07T10:00:00+01:00"),
  });
});
afterEach(() => {
  vi.useRealTimers();
});

/** One account with one adult; `apartment` decides the flat. */
async function person(apartment: string, name?: string) {
  const [user] = await db
    .insert(users)
    .values(
      makeUser({
        emailVerified: new Date(),
        consentAt: new Date(),
        locale: "en",
        building: "K",
        apartment,
      }),
    )
    .returning();
  const [p] = await db
    .insert(participants)
    .values(makeParticipant(user!.id, { name: name ?? `P${apartment}` }))
    .returning();
  return { user: user!, id: p!.id };
}

async function asOrganizer() {
  const [kate] = await db
    .insert(users)
    .values(
      makeUser({
        email: ORGANIZER_EMAIL,
        emailVerified: new Date(),
        consentAt: new Date(),
      }),
    )
    .returning();
  signIn(kate!);
}

function signIn(user: { id: string; email: string; sessionVersion: number }) {
  authMock.mockResolvedValue({
    user: { id: user.id, email: user.email },
    sessionVersion: user.sessionVersion,
  });
}

async function link(ids: string[]) {
  await db.insert(assignments).values(
    ids.map((giver, i) => ({
      giverId: giver,
      receiverId: ids[(i + 1) % ids.length]!,
    })),
  );
}

function form(values: Record<string, string>): FormData {
  const data = new FormData();
  for (const [k, v] of Object.entries(values)) data.set(k, v);
  return data;
}

describe("backup list", () => {
  it("adds unmarked receivers from Jan 1", async () => {
    await asOrganizer();
    const ids = [
      (await person("1")).id,
      (await person("2")).id,
      (await person("3")).id,
    ];
    await link(ids);
    await db
      .update(assignments)
      .set({ giftLeftAt: new Date() })
      .where(eq(assignments.receiverId, ids[1]!));
    const { listBackupNeeded } = await import("@/features/admin");

    expect(
      await listBackupNeeded(new Date("2026-12-31T12:00:00+01:00")),
    ).toEqual([]);
    const reveal = await listBackupNeeded(
      new Date("2027-01-01T09:00:00+01:00"),
    );
    expect(reveal.map((e) => e.participantId).sort()).toEqual(
      [ids[0], ids[2]].sort(),
    );
    expect(new Set(reveal.map((e) => e.reason))).toEqual(
      new Set(["notMarked"]),
    );
  });

  it("lists not-found gifts and people without a Santa, with the reason", async () => {
    await asOrganizer();
    const [a, b, c] = [
      await person("1"),
      await person("2"),
      await person("3"),
    ] as const;
    await link([a.id, b.id, c.id]);
    await db
      .update(assignments)
      .set({ giftLeftAt: new Date(), notFoundAt: new Date() })
      .where(eq(assignments.receiverId, b.id));
    await db
      .update(assignments)
      .set({ giverId: null })
      .where(eq(assignments.receiverId, c.id));
    const { listBackupNeeded } = await import("@/features/admin");

    const list = await listBackupNeeded(new Date("2026-12-28T12:00:00+01:00"));
    expect(list.map((e) => [e.participantId, e.reason]).sort()).toEqual(
      [
        [b.id, "notFound"],
        [c.id, "noSanta"],
      ].sort(),
    );
  });

  it("payload has no giver", async () => {
    await asOrganizer();
    const ids = [
      (await person("1")).id,
      (await person("2")).id,
      (await person("3")).id,
    ];
    await link(ids);
    await db
      .update(assignments)
      .set({ giverId: null })
      .where(eq(assignments.receiverId, ids[0]!));
    const { listBackupNeeded } = await import("@/features/admin");

    const list = await listBackupNeeded(new Date("2027-01-02T12:00:00+01:00"));
    expect(list.length).toBeGreaterThan(0);
    for (const entry of list) {
      expect(Object.keys(entry).sort()).toEqual([
        "apartment",
        "building",
        "name",
        "participantId",
        "reason",
      ]);
    }
    expect(JSON.stringify(list)).not.toMatch(/giver/i);
  });

  it("marking a gift as organized moves it to the organized list", async () => {
    await asOrganizer();
    const [a, b, c] = [
      await person("1"),
      await person("2"),
      await person("3"),
    ] as const;
    await link([a.id, b.id, c.id]);
    await db
      .update(assignments)
      .set({ giverId: null })
      .where(eq(assignments.receiverId, b.id));
    const { listBackupNeeded, listBackupOrganized, organizeBackup } =
      await import("@/features/admin");

    expect(await organizeBackup(b.id)).toEqual({ ok: true });
    expect(await organizeBackup(b.id)).toEqual({ ok: false });
    expect(await listBackupNeeded(new Date())).toEqual([]);
    expect((await listBackupOrganized()).map((e) => e.participantId)).toEqual([
      b.id,
    ]);
  });

  it("is closed to everyone but the organizer", async () => {
    const a = await person("1");
    signIn(a.user);
    const { listBackupNeeded } = await import("@/features/admin");
    await expect(listBackupNeeded(new Date())).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
  });
});

describe("updateSettings", () => {
  const good = {
    applicationsCloseOn: "2026-12-06",
    drawOn: "2026-12-08",
    giftsStartOn: "2026-12-25",
    giftsEndOn: "2026-12-31",
    revealOn: "2027-01-01",
    closeOn: "2027-01-10",
  };

  it("settings reject dates out of order", async () => {
    await asOrganizer();
    const { updateSettings } = await import("@/features/admin");
    const before = (await db.select().from(settings))[0];

    expect(
      await updateSettings({}, form({ ...good, revealOn: "2026-12-20" })),
    ).toEqual({ error: "order" });
    expect(
      await updateSettings({}, form({ ...good, drawOn: "2026-02-30" })),
    ).toEqual({ error: "invalid" });
    expect((await db.select().from(settings))[0]).toEqual(before);
  });

  it("saves valid dates and never runs the draw", async () => {
    await asOrganizer();
    await db.update(settings).set({ drawnAt: null });
    const { updateSettings } = await import("@/features/admin");

    expect(await updateSettings({}, form(good))).toEqual({ saved: true });
    const row = (await db.select().from(settings))[0];
    expect(row?.drawOn).toBe("2026-12-08");
    expect(row?.drawnAt).toBeNull();
    expect(await db.select().from(assignments)).toHaveLength(0);
  });

  it("is closed to everyone but the organizer", async () => {
    const a = await person("1");
    signIn(a.user);
    const { updateSettings } = await import("@/features/admin");
    await expect(updateSettings({}, form(good))).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
  });
});

describe("deleteAccountAction", () => {
  it("account deletes itself in collect, later it is refused", async () => {
    await db.update(settings).set({ drawnAt: null });
    vi.setSystemTime(new Date("2026-11-20T12:00:00+01:00"));
    const a = await person("1");
    const [kid] = await db
      .insert(participants)
      .values(makeParticipant(a.user.id, { kind: "child", name: "Kid" }))
      .returning();
    await db.insert(translations).values({
      sourceKey: `participant:${kid!.id}:wishes`,
      locale: "ru",
      text: "x",
      sourceHash: "h",
    });
    const b = await person("2");
    const { deleteAccountAction } = await import("@/features/account");

    signIn(b.user);
    await db.update(settings).set({ drawnAt: new Date() });
    vi.setSystemTime(new Date("2026-12-10T12:00:00+01:00"));
    expect(await deleteAccountAction({}, form({ confirm: "yes" }))).toEqual({
      error: "closed",
    });
    expect(await db.select().from(users)).toHaveLength(2);

    await db.update(settings).set({ drawnAt: null });
    vi.setSystemTime(new Date("2026-11-20T12:00:00+01:00"));
    signIn(a.user);
    expect(await deleteAccountAction({}, form({ confirm: "no" }))).toEqual({
      error: "failed",
    });
    expect(await deleteAccountAction({}, form({ confirm: "yes" }))).toEqual({
      deleted: true,
    });
    expect((await db.select().from(users)).map((u) => u.id)).toEqual([
      b.user.id,
    ]);
    expect(await db.select().from(participants)).toHaveLength(1);
    expect(await db.select().from(translations)).toHaveLength(0);
  });
});

describe("resendBroadcast", () => {
  it("sends only in the phase where the mailing is due", async () => {
    await asOrganizer();
    const ids = [
      (await person("1")).id,
      (await person("2")).id,
      (await person("3")).id,
    ];
    await link(ids);
    const { resendBroadcast } = await import("@/features/admin");

    // 10 December: waiting, so the 25 December mail is not due yet.
    expect(await resendBroadcast("gifts-open")).toEqual({
      total: 0,
      sent: 0,
      failed: 0,
    });
    expect(sent).toHaveLength(0);
    expect(await resendBroadcast("nonsense")).toEqual({
      total: 0,
      sent: 0,
      failed: 0,
    });

    vi.setSystemTime(new Date("2026-12-26T12:00:00+01:00"));
    expect(await resendBroadcast("gifts-open")).toMatchObject({
      total: 3,
      sent: 3,
    });
    expect(await resendBroadcast("gifts-open")).toMatchObject({ sent: 0 });
  });
});
