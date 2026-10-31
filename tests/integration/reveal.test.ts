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
  guesses,
  participants,
  settings,
  users,
} from "@/db/schema";
import { DEFAULT_DATES } from "@/lib/game-phase";
import { createTestDb, type TestDb } from "./helpers/test-db";

let db: TestDb;
let cleanup: () => Promise<void>;
const authMock = vi.fn();

vi.mock("@/db/client", () => ({ getDb: () => db }));
const jar = vi.hoisted(() => new Map<string, string>());
vi.mock("next/headers", () => ({
  cookies: async () => ({
    set: (name: string, value: string) => jar.set(name, value),
    get: (name: string) =>
      jar.has(name) ? { name, value: jar.get(name) } : undefined,
  }),
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

beforeAll(async () => {
  ({ db, cleanup } = await createTestDb());
});
afterAll(async () => {
  await cleanup();
});
beforeEach(async () => {
  jar.clear();
  authMock.mockReset();
  await db.delete(guesses);
  await db.delete(assignments);
  await db.delete(participants);
  await db.delete(users);
  await db.delete(settings);
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-12-26T12:00:00+01:00"));
});
afterEach(() => {
  vi.useRealTimers();
});

function signInAs(user: { id: string; email: string; sessionVersion: number }) {
  authMock.mockResolvedValue({
    user: { id: user.id, email: user.email },
    sessionVersion: user.sessionVersion,
  });
}

async function person(
  name: string,
  overrides: Partial<typeof users.$inferInsert> = {},
  participant: Partial<typeof participants.$inferInsert> = {},
) {
  const [user] = await db
    .insert(users)
    .values(
      makeUser({
        emailVerified: new Date(),
        consentAt: new Date(),
        locale: "en",
        building: "K",
        apartment: "1",
        ...overrides,
      }),
    )
    .returning();
  if (!user) throw new Error("no user");
  const [p] = await db
    .insert(participants)
    .values(makeParticipant(user.id, { name, ...participant }))
    .returning();
  if (!p) throw new Error("no participant");
  return { user, p };
}

/**
 * Draw done. `chain` lists participants in a ring: each gives to the next.
 * Optional overrides per receiver index.
 */
async function ring(people: { p: { id: string } }[]) {
  await db.insert(settings).values({
    id: 1,
    ...DEFAULT_DATES,
    drawnAt: new Date("2026-12-07T10:00:00Z"),
  });
  await db.insert(assignments).values(
    people.map((giver, i) => ({
      giverId: giver.p.id,
      receiverId: (people[(i + 1) % people.length] as { p: { id: string } }).p
        .id,
    })),
  );
}

async function trio() {
  const me = await person("Me Mia", { building: "K", apartment: "1" });
  const santa = await person("Santa Sam", { building: "D", apartment: "4" });
  const other = await person("Other Olga", { building: "B", apartment: "9" });
  // other -> me, me -> santa, santa -> other: `other` is my Santa.
  await ring([other, me, santa]);
  return { me, santa, other };
}

const reveal = () => import("@/features/reveal");
const at = (iso: string) => vi.setSystemTime(new Date(iso));
const guessOf = async (id: string) =>
  (await db.select().from(guesses).where(eq(guesses.participantId, id)))[0];

describe("guess options", () => {
  it("contain only name and building, without own account", async () => {
    const { me, santa, other } = await trio();
    const [child] = await db
      .insert(participants)
      .values(makeParticipant(me.user.id, { name: "Mia Kid", kind: "child" }))
      .returning();
    if (!child) throw new Error("no child");
    await db
      .insert(assignments)
      .values({ receiverId: child.id, giverId: null });

    const late = await person("Late Lena", { building: "K", apartment: "7" });
    const { listGuessOptions } = await reveal();
    const result = await listGuessOptions(me.user.id, me.p.id);
    expect(result).toMatchObject({ state: "ready", guessedId: null });
    const options = result && "options" in result ? result.options : [];
    expect(options.map((o) => o.name).sort()).toEqual([
      "Other Olga",
      "Santa Sam",
    ]);
    expect(options.find((o) => o.id === santa.p.id)).toEqual({
      id: santa.p.id,
      name: "Santa Sam",
      building: "D",
    });
    expect(options.some((o) => o.id === other.p.id)).toBe(true);
    expect(options.some((o) => o.id === late.p.id)).toBe(false);
    for (const option of options) {
      expect(Object.keys(option).sort()).toEqual(["building", "id", "name"]);
    }
  });

  it("is null for a foreign participant and notInDraw for a latecomer", async () => {
    const { me, santa } = await trio();
    const late = await person("Late Lena");
    const { listGuessOptions } = await reveal();
    expect(await listGuessOptions(me.user.id, santa.p.id)).toBeNull();
    expect(await listGuessOptions(late.user.id, late.p.id)).toEqual({
      state: "notInDraw",
    });
  });
});

describe("saveGuess", () => {
  it("can change until Dec 31 and is rejected on Jan 1", async () => {
    const { me, santa, other } = await trio();
    signInAs(me.user);
    const { saveGuess } = await reveal();

    expect(
      await saveGuess({ participantId: me.p.id, guessedId: santa.p.id }),
    ).toEqual({ saved: true });
    at("2026-12-31T23:30:00+01:00");
    expect(
      await saveGuess({ participantId: me.p.id, guessedId: other.p.id }),
    ).toEqual({ saved: true });
    expect((await guessOf(me.p.id))?.guessedId).toBe(other.p.id);

    at("2027-01-01T00:05:00+01:00");
    expect(
      await saveGuess({ participantId: me.p.id, guessedId: santa.p.id }),
    ).toEqual({ error: "closed" });
    expect((await guessOf(me.p.id))?.guessedId).toBe(other.p.id);
  });

  it("answers the same for a right and a wrong guess", async () => {
    const { me, santa, other } = await trio();
    signInAs(me.user);
    const { saveGuess } = await reveal();
    const right = await saveGuess({
      participantId: me.p.id,
      guessedId: other.p.id,
    });
    const wrong = await saveGuess({
      participantId: me.p.id,
      guessedId: santa.p.id,
    });
    expect(right).toEqual(wrong);
  });

  it("rejects own account, outsiders, foreign participants and bad input", async () => {
    const { me, santa } = await trio();
    const late = await person("Late Lena");
    signInAs(me.user);
    const { saveGuess } = await reveal();
    expect(
      await saveGuess({ participantId: me.p.id, guessedId: me.p.id }),
    ).toEqual({ error: "invalid" });
    expect(
      await saveGuess({ participantId: me.p.id, guessedId: late.p.id }),
    ).toEqual({ error: "invalid" });
    expect(
      await saveGuess({ participantId: santa.p.id, guessedId: me.p.id }),
    ).toEqual({ error: "notFound" });
    expect(await saveGuess({ participantId: "x", guessedId: "y" })).toEqual({
      error: "invalid",
    });
    expect(await guessOf(me.p.id)).toBeUndefined();
  });
});

describe("getReveal", () => {
  it("returns null (404) before Jan 1, also for the page", async () => {
    const { me, other } = await trio();
    signInAs(me.user);
    const { getReveal } = await reveal();
    expect(await getReveal(me.user.id, me.p.id)).toBeNull();
    at("2026-12-31T23:59:00+01:00");
    expect(await getReveal(me.user.id, me.p.id)).toBeNull();
    const page = (
      await import("../../src/app/(site)/home/reveal/[participantId]/page")
    ).default;
    await expect(
      page({ params: Promise.resolve({ participantId: me.p.id }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");

    at("2027-01-01T09:00:00+01:00");
    expect(await getReveal(other.user.id, me.p.id)).toBeNull();
    expect(await getReveal(me.user.id, me.p.id)).not.toBeNull();
  });

  it("latecomer after Jan 1 gets notInDraw", async () => {
    await trio();
    const late = await person("Late Lena");
    at("2027-01-01T09:00:00+01:00");
    const { getReveal } = await reveal();
    expect(await getReveal(late.user.id, late.p.id)).toEqual({
      state: "notInDraw",
    });
  });

  it("shows the santa and whether the guess was right", async () => {
    const { me, other } = await trio();
    await db
      .insert(guesses)
      .values({ participantId: me.p.id, guessedId: other.p.id });
    at("2027-01-01T09:00:00+01:00");
    const { getReveal } = await reveal();
    expect(await getReveal(me.user.id, me.p.id)).toEqual({
      state: "ready",
      santa: { name: "Other Olga", building: "B" },
      guessCorrect: true,
      guessedName: "Other Olga",
    });
  });

  it("wrong guess shows the santa and the guessed name", async () => {
    const { me, santa } = await trio();
    await db
      .insert(guesses)
      .values({ participantId: me.p.id, guessedId: santa.p.id });
    at("2027-01-01T09:00:00+01:00");
    const { getReveal } = await reveal();
    expect(await getReveal(me.user.id, me.p.id)).toEqual({
      state: "ready",
      santa: { name: "Other Olga", building: "B" },
      guessCorrect: false,
      guessedName: "Santa Sam",
    });
  });

  it("no guess shows only the santa", async () => {
    const { me } = await trio();
    at("2027-01-01T09:00:00+01:00");
    const { getReveal } = await reveal();
    expect(await getReveal(me.user.id, me.p.id)).toEqual({
      state: "ready",
      santa: { name: "Other Olga", building: "B" },
      guessCorrect: null,
      guessedName: null,
    });
  });

  it("no giver or organized backup shows backup without a name or result", async () => {
    const { me, santa, other } = await trio();
    await db
      .insert(guesses)
      .values({ participantId: me.p.id, guessedId: other.p.id });
    at("2027-01-01T09:00:00+01:00");
    const { getReveal } = await reveal();
    const backup = {
      state: "ready",
      santa: "backup",
      guessCorrect: null,
      guessedName: null,
    };

    await db
      .update(assignments)
      .set({ backupOrganizedAt: new Date() })
      .where(eq(assignments.receiverId, me.p.id));
    expect(await getReveal(me.user.id, me.p.id)).toEqual(backup);

    await db
      .update(assignments)
      .set({ backupOrganizedAt: null, giverId: null })
      .where(eq(assignments.receiverId, me.p.id));
    expect(await getReveal(me.user.id, me.p.id)).toEqual(backup);
    expect(await getReveal(santa.user.id, santa.p.id)).toMatchObject({
      state: "ready",
    });
  });
});
