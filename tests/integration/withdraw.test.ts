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

/** ids[0] gives to ids[1], ..., the last gives to the first. */
async function link(ids: string[]) {
  await db.insert(assignments).values(
    ids.map((giver, i) => ({
      giverId: giver,
      receiverId: ids[(i + 1) % ids.length]!,
    })),
  );
}

async function giverOf(receiverId: string) {
  const [row] = await db
    .select()
    .from(assignments)
    .where(eq(assignments.receiverId, receiverId));
  return row;
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
  authMock.mockResolvedValue({
    user: { id: kate!.id, email: kate!.email },
    sessionVersion: kate!.sessionVersion,
  });
}

async function withdraw(id: string) {
  const { withdrawParticipant } = await import("@/features/admin");
  return withdrawParticipant(id);
}

describe("withdrawParticipant", () => {
  it("A→D→R after withdrawing D becomes A→R and A gets an email", async () => {
    const [a, d, r, x] = [
      await person("1"),
      await person("2"),
      await person("3"),
      await person("4"),
    ] as const;
    await link([a.id, d.id, r.id, x.id]);

    expect(await withdraw(d.id)).toEqual({ ok: true, removed: 1 });

    const row = await giverOf(r.id);
    expect(row?.giverId).toBe(a.id);
    expect(row?.reassignedAt).not.toBeNull();
    expect(await giverOf(d.id)).toBeUndefined();
    expect(await db.select().from(assignments)).toHaveLength(3);
    expect(sent.map((m) => m.to)).toEqual([a.user.email]);
    expect(sent[0]?.subject).toMatch(/recipient|changed/i);
  });

  it("old giver of D gets 404 on D's card", async () => {
    const [a, d, r, x] = [
      await person("1"),
      await person("2"),
      await person("3"),
      await person("4"),
    ] as const;
    await link([a.id, d.id, r.id, x.id]);
    await withdraw(d.id);

    const { getRecipient } = await import("@/features/gift");
    expect(await getRecipient(a.user.id, d.id)).toBeNull();
    const own = await getRecipient(a.user.id, a.id);
    expect(own).toMatchObject({ state: "ready", reassigned: true });
  });

  it("if A and R share a flat, R needs a backup and A has nothing to give", async () => {
    const a = await person("5");
    const d = await person("2");
    const r = await person("5 ");
    const x = await person("4");
    await link([a.id, d.id, r.id, x.id]);

    await withdraw(d.id);

    expect((await giverOf(r.id))?.giverId).toBeNull();
    expect((await giverOf(r.id))?.reassignedAt).toBeNull();
    expect(sent.map((m) => m.to)).toEqual([a.user.email]);
    const { getRecipient } = await import("@/features/gift");
    expect(await getRecipient(a.user.id, a.id)).toEqual({ state: "none" });

    await asOrganizer();
    const { listBackupNeeded } = await import("@/features/admin");
    const list = await listBackupNeeded(new Date());
    expect(list.map((e) => [e.participantId, e.reason])).toEqual([
      [r.id, "noSanta"],
    ]);
  });

  it("withdrawal fails from Dec 25", async () => {
    const [a, d, r] = [
      await person("1"),
      await person("2"),
      await person("3"),
    ] as const;
    await link([a.id, d.id, r.id]);
    vi.setSystemTime(new Date("2026-12-25T09:00:00+01:00"));

    expect(await withdraw(d.id)).toEqual({ ok: false, reason: "closed" });
    expect(await db.select().from(participants)).toHaveLength(3);
    expect(await db.select().from(assignments)).toHaveLength(3);
    expect(sent).toHaveLength(0);
  });

  it("a chain of two consecutive withdrawals stays consistent", async () => {
    const [a, d1, d2, r, x] = [
      await person("1"),
      await person("2"),
      await person("3"),
      await person("4"),
      await person("6"),
    ] as const;
    await link([a.id, d1.id, d2.id, r.id, x.id]);

    await withdraw(d1.id);
    await withdraw(d2.id);

    const rows = await db.select().from(assignments);
    expect(rows).toHaveLength(3);
    expect((await giverOf(r.id))?.giverId).toBe(a.id);
    // Everybody left is a giver of exactly one and a receiver of exactly one.
    const givers = rows.map((row) => row.giverId).sort();
    expect(givers).toEqual([a.id, r.id, x.id].sort());
  });

  it("withdrawing an account removes all its participants and their data", async () => {
    const a = await person("1");
    const d = await person("2");
    const [kid] = await db
      .insert(participants)
      .values(
        makeParticipant(d.user.id, {
          kind: "child",
          name: "Kid",
          photoUrl: "data:image/png;base64,AAAA",
        }),
      )
      .returning();
    const r = await person("3");
    const x = await person("4");
    await link([a.id, d.id, kid!.id, r.id, x.id]);
    const [post] = await db
      .insert(wallPosts)
      .values({ participantId: kid!.id, text: "thanks" })
      .returning();
    await db.insert(translations).values([
      {
        sourceKey: `participant:${d.id}:wishes`,
        locale: "ru",
        text: "x",
        sourceHash: "h",
      },
      {
        sourceKey: `post:${post!.id}`,
        locale: "ru",
        text: "y",
        sourceHash: "h",
      },
    ]);

    expect(await withdraw(d.id)).toEqual({ ok: true, removed: 2 });

    const left = await db.select({ id: participants.id }).from(participants);
    expect(left.map((p) => p.id).sort()).toEqual([a.id, r.id, x.id].sort());
    expect(await db.select().from(wallPosts)).toHaveLength(0);
    expect(await db.select().from(translations)).toHaveLength(0);
    expect((await giverOf(r.id))?.giverId).toBe(a.id);
    expect(await db.select().from(assignments)).toHaveLength(3);
    // A got one mail for the whole account leaving.
    expect(sent).toHaveLength(1);
  });

  it("a participant without a giver leaves their receiver without a Santa", async () => {
    const [a, d, r] = [
      await person("1"),
      await person("2"),
      await person("3"),
    ] as const;
    await link([a.id, d.id, r.id]);
    await db
      .update(assignments)
      .set({ giverId: null })
      .where(eq(assignments.receiverId, d.id));

    await withdraw(d.id);

    expect((await giverOf(r.id))?.giverId).toBeNull();
    expect(sent).toHaveLength(0);
  });

  it("collect: removing an application is plain deletion", async () => {
    await db.update(settings).set({ drawnAt: null });
    vi.setSystemTime(new Date("2026-11-20T12:00:00+01:00"));
    const a = await person("1");
    expect(await withdraw(a.id)).toEqual({ ok: true, removed: 1 });
    expect(await db.select().from(participants)).toHaveLength(0);
  });

  it("the action lets the organizer withdraw and goes back to the table", async () => {
    await asOrganizer();
    const [a, d, r] = [
      await person("1"),
      await person("2"),
      await person("3"),
    ] as const;
    await link([a.id, d.id, r.id]);
    const { withdrawAction } = await import("@/features/admin");
    await expect(withdrawAction(d.id)).rejects.toThrow(
      "NEXT_REDIRECT:/admin/participants",
    );
    expect(await db.select().from(participants)).toHaveLength(2);
  });

  it("the action refuses a malformed id", async () => {
    await asOrganizer();
    const { withdrawAction } = await import("@/features/admin");
    expect(await withdrawAction("nope")).toEqual({
      ok: false,
      reason: "notFound",
    });
  });

  it("the action refuses anyone but the organizer", async () => {
    const a = await person("1");
    authMock.mockResolvedValue({
      user: { id: a.user.id, email: a.user.email },
      sessionVersion: a.user.sessionVersion,
    });
    const { withdrawAction } = await import("@/features/admin");
    await expect(withdrawAction(a.id)).rejects.toThrow("NEXT_NOT_FOUND");
    expect(await db.select().from(participants)).toHaveLength(1);
  });
});
