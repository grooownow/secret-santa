import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { makeParticipant, makeUser } from "@/db/factories";
import {
  assignments,
  guesses,
  participants,
  settings,
  users,
} from "@/db/schema";
import { DEFAULT_DATES } from "@/features/game/phase";
import { createTestDb, type TestDb } from "./helpers/test-db";

let db: TestDb;
let cleanup: () => Promise<void>;

vi.mock("@/db/client", () => ({ getDb: () => db }));

beforeAll(async () => {
  ({ db, cleanup } = await createTestDb());
});
afterAll(async () => {
  await cleanup();
});

async function newUser() {
  const [u] = await db.insert(users).values(makeUser()).returning();
  if (!u) throw new Error("user insert failed");
  return u;
}

async function newParticipant(
  userId: string,
  o: Parameters<typeof makeParticipant>[1] = {},
) {
  const [p] = await db
    .insert(participants)
    .values(makeParticipant(userId, o))
    .returning();
  if (!p) throw new Error("participant insert failed");
  return p;
}

describe("getSettings", () => {
  it("creates the single row with default dates and reuses it", async () => {
    const { getSettings } = await import("@/features/game/settings");

    const first = await getSettings();
    const second = await getSettings();

    expect(first).toMatchObject({ ...DEFAULT_DATES, drawnAt: null });
    expect(second).toEqual(first);
    expect(await db.select().from(settings)).toHaveLength(1);
  });

  it("returns edited dates", async () => {
    const { getSettings } = await import("@/features/game/settings");
    await db.update(settings).set({ closeOn: "2027-02-01" });

    expect((await getSettings()).closeOn).toBe("2027-02-01");
  });
});

describe("users defaults", () => {
  it("defaults locale to en and leaves profile fields empty", async () => {
    const u = await newUser();
    expect(u.locale).toBe("en");
    expect(u.building).toBeNull();
    expect(u.consentAt).toBeNull();
    expect(u.passwordHash).toBeNull();
  });
});

describe("participants", () => {
  it("allows only one adult per account but many children", async () => {
    const u = await newUser();
    await newParticipant(u.id);
    await newParticipant(u.id, { kind: "child", age: 7 });
    await newParticipant(u.id, { kind: "child", age: 9 });

    await expect(newParticipant(u.id)).rejects.toThrow();
  });

  it("deleting a user cascades to participants", async () => {
    const u = await newUser();
    const p = await newParticipant(u.id);
    await db.delete(users).where(eq(users.id, u.id));

    expect(
      await db.select().from(participants).where(eq(participants.id, p.id)),
    ).toHaveLength(0);
  });
});

describe("assignments and guesses", () => {
  it("a giver gives to at most one receiver", async () => {
    const [g, r1, r2] = await Promise.all(
      [0, 1, 2].map(async () => newParticipant((await newUser()).id)),
    );
    await db.insert(assignments).values({ receiverId: r1!.id, giverId: g!.id });

    await expect(
      db.insert(assignments).values({ receiverId: r2!.id, giverId: g!.id }),
    ).rejects.toThrow();
  });

  it("removing a giver keeps the receiver row with giverId null", async () => {
    const giverUser = await newUser();
    const g = await newParticipant(giverUser.id);
    const r = await newParticipant((await newUser()).id);
    await db.insert(assignments).values({ receiverId: r.id, giverId: g.id });

    await db.delete(users).where(eq(users.id, giverUser.id));

    const [row] = await db
      .select()
      .from(assignments)
      .where(eq(assignments.receiverId, r.id));
    expect(row?.giverId).toBeNull();
  });

  it("removing a receiver removes the assignment and guesses about them", async () => {
    const receiverUser = await newUser();
    const r = await newParticipant(receiverUser.id);
    const g = await newParticipant((await newUser()).id);
    await db.insert(assignments).values({ receiverId: r.id, giverId: g.id });
    await db.insert(guesses).values({ participantId: g.id, guessedId: r.id });

    await db.delete(users).where(eq(users.id, receiverUser.id));

    expect(
      await db
        .select()
        .from(assignments)
        .where(eq(assignments.receiverId, r.id)),
    ).toHaveLength(0);
    expect(
      await db.select().from(guesses).where(eq(guesses.participantId, g.id)),
    ).toHaveLength(0);
  });
});
