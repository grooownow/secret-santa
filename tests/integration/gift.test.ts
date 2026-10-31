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
  users,
} from "@/db/schema";
import { setMailTransportForTests, type MailMessage } from "@/features/mail";
import { DEFAULT_DATES } from "@/lib/game-phase";
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

const sent: MailMessage[] = [];
const deferred: Promise<unknown>[] = [];

async function flush() {
  while (deferred.length) {
    // oxlint-disable-next-line no-await-in-loop
    await deferred.shift();
  }
}

beforeAll(async () => {
  ({ db, cleanup } = await createTestDb());
  setMailTransportForTests(async (m) => {
    sent.push(m);
  });
  setRunAfterResponseForTests((work) => {
    deferred.push(Promise.resolve().then(work));
  });
});
afterAll(async () => {
  setMailTransportForTests(null);
  setRunAfterResponseForTests(null);
  await cleanup();
});
beforeEach(async () => {
  await flush();
  sent.length = 0;
  authMock.mockReset();
  await db.delete(sentEmails);
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

/** Draw done; `giver` gives to `receiver`. */
async function drawn(
  giver: { p: { id: string } },
  receiver: { p: { id: string } },
) {
  await db.insert(settings).values({
    id: 1,
    ...DEFAULT_DATES,
    drawnAt: new Date("2026-12-07T10:00:00Z"),
  });
  await db
    .insert(assignments)
    .values({ receiverId: receiver.p.id, giverId: giver.p.id });
}

async function pair() {
  const giver = await person("Giver Gina", { apartment: "2" });
  const receiver = await person(
    "Recipient Rob",
    { building: "B", apartment: "17", email: "rob@example.dev" },
    {
      photoUrl: "https://blob.example/rob.jpg",
      wishes: "books",
      avoid: "nuts",
    },
  );
  await drawn(giver, receiver);
  return { giver, receiver };
}

const actions = () => import("@/features/gift");
const at = (iso: string) => vi.setSystemTime(new Date(iso));
const row = async (receiverId: string) =>
  (
    await db
      .select()
      .from(assignments)
      .where(eq(assignments.receiverId, receiverId))
  )[0];

describe("recipient card", () => {
  it("shows the address and photo to the giver", async () => {
    const { giver, receiver } = await pair();
    signInAs(giver.user);
    const { getRecipient } = await actions();
    const result = await getRecipient(giver.user.id, giver.p.id);
    expect(result).toMatchObject({
      state: "ready",
      recipient: {
        name: "Recipient Rob",
        building: "B",
        apartment: "17",
        photoUrl: "https://blob.example/rob.jpg",
        wishes: "books",
        sourceLocale: "en",
      },
      reassigned: false,
    });
    expect(result && "recipient" in result && result.recipient.id).toBe(
      receiver.p.id,
    );
  });

  it("another account's participantId gives 404 (null and the page)", async () => {
    const { giver, receiver } = await pair();
    const { getRecipient } = await actions();
    expect(await getRecipient(receiver.user.id, giver.p.id)).toBeNull();
    expect(await getRecipient(giver.user.id, receiver.p.id)).toBeNull();

    signInAs(receiver.user);
    const page = (
      await import("../../src/app/(site)/home/recipient/[participantId]/page")
    ).default;
    await expect(
      page({ params: Promise.resolve({ participantId: giver.p.id }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(
      page({ params: Promise.resolve({ participantId: "not-a-uuid" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("a former giver no longer reaches the recipient after reassignment", async () => {
    const { giver, receiver } = await pair();
    const next = await person("Next Nora", { apartment: "3" });
    await db
      .update(assignments)
      .set({ giverId: next.p.id, reassignedAt: new Date() })
      .where(eq(assignments.receiverId, receiver.p.id));
    const { getRecipient } = await actions();

    expect(await getRecipient(giver.user.id, giver.p.id)).toEqual({
      state: "none",
    });
    const fresh = await getRecipient(next.user.id, next.p.id);
    expect(fresh).toMatchObject({ state: "ready", reassigned: true });
  });

  it("a giver with nobody to give to sees the nothing-to-give state", async () => {
    const { giver, receiver } = await pair();
    await db
      .update(assignments)
      .set({ giverId: null })
      .where(eq(assignments.receiverId, receiver.p.id));
    const { getRecipient } = await actions();
    expect(await getRecipient(giver.user.id, giver.p.id)).toEqual({
      state: "none",
    });
  });

  it("before the draw there is no recipient", async () => {
    const lone = await person("Lone");
    const { getRecipient } = await actions();
    expect(await getRecipient(lone.user.id, lone.p.id)).toEqual({
      state: "notDrawn",
    });
  });
});

describe("getMyGift", () => {
  it("never returns the giver id or name", async () => {
    const { giver, receiver } = await pair();
    signInAs(giver.user);
    await (
      await actions()
    ).markGift({
      participantId: giver.p.id,
      place: "locker",
      code: "42",
      note: "enjoy",
    });
    const { getMyGift } = await actions();
    const mine = await getMyGift(receiver.user.id, receiver.p.id);
    expect(mine).toMatchObject({
      state: "ready",
      status: "left",
      place: "locker",
      code: "42",
      note: "enjoy",
    });
    const dump = JSON.stringify(mine);
    expect(dump).not.toContain(giver.p.id);
    expect(dump).not.toContain(giver.user.id);
    expect(dump).not.toContain("Giver Gina");
    expect(dump).not.toContain(giver.user.email);
    expect(await getMyGift(giver.user.id, receiver.p.id)).toBeNull();
  });
});

describe("markGift", () => {
  it("marking before Dec 25 and after Dec 31 is rejected", async () => {
    const { giver, receiver } = await pair();
    signInAs(giver.user);
    const { markGift } = await actions();

    at("2026-12-24T12:00:00+01:00");
    expect(await markGift(input(giver.p.id))).toEqual({ error: "closed" });
    at("2027-01-01T12:00:00+01:00");
    expect(await markGift(input(giver.p.id))).toEqual({ error: "closed" });
    expect((await row(receiver.p.id))?.giftLeftAt).toBeNull();

    at("2026-12-25T00:30:00+01:00");
    expect(await markGift(input(giver.p.id))).toEqual({ saved: true });
    at("2026-12-31T23:30:00+01:00");
    expect(await markGift(input(giver.p.id, { code: "43" }))).toEqual({
      saved: true,
    });
  });

  it("marking emails the receiver with place, code and note, and only them", async () => {
    const { giver, receiver } = await pair();
    signInAs(giver.user);
    await (await actions()).markGift(input(giver.p.id));
    await flush();

    expect(sent).toHaveLength(1);
    const [mail] = sent;
    expect(mail?.to).toBe("rob@example.dev");
    expect(mail?.text).toContain("42");
    expect(mail?.text).toContain("enjoy");
    expect(mail?.text).toContain("Recipient Rob");
    expect(mail?.text).not.toContain("Giver Gina");
    expect(mail?.html).not.toContain("Giver Gina");
    expect(mail?.text).not.toContain(giver.user.email);
    const saved = await row(receiver.p.id);
    expect(saved).toMatchObject({ giftPlace: "locker", giftVersion: 1 });
    expect(saved?.giftLeftAt).not.toBeNull();
  });

  it("editing the place resends the email under a new version key", async () => {
    const { giver, receiver } = await pair();
    signInAs(giver.user);
    const { markGift } = await actions();
    await markGift(input(giver.p.id));
    await markGift(input(giver.p.id, { place: "mailbox", code: "7" }));
    await flush();

    expect(sent).toHaveLength(2);
    expect(sent[1]?.text).toContain("7");
    const keys = (await db.select().from(sentEmails)).map((r) => r.key).sort();
    expect(keys).toEqual([
      `gift:${receiver.p.id}:1`,
      `gift:${receiver.p.id}:2`,
    ]);
    expect(await row(receiver.p.id)).toMatchObject({
      giftPlace: "mailbox",
      giftVersion: 2,
    });
  });

  it("note and code are limited to 200 and 50 chars", async () => {
    const { giver } = await pair();
    signInAs(giver.user);
    const { markGift } = await actions();
    expect(
      await markGift(input(giver.p.id, { note: "n".repeat(201) })),
    ).toEqual({ error: "invalid" });
    expect(await markGift(input(giver.p.id, { code: "c".repeat(51) }))).toEqual(
      { error: "invalid" },
    );
    expect(
      await markGift(
        input(giver.p.id, { note: "n".repeat(200), code: "c".repeat(50) }),
      ),
    ).toEqual({ saved: true });
    expect(await markGift(input(giver.p.id, { place: "roof" }))).toEqual({
      error: "invalid",
    });
  });

  it("only the giver of that recipient can mark", async () => {
    const { giver, receiver } = await pair();
    const stranger = await person("Stranger", { apartment: "9" });
    const { markGift } = await actions();

    signInAs(stranger.user);
    expect(await markGift(input(giver.p.id))).toEqual({ error: "notFound" });
    expect(await markGift(input(stranger.p.id))).toEqual({ error: "notFound" });
    signInAs(receiver.user);
    expect(await markGift(input(receiver.p.id))).toEqual({ error: "notFound" });
    expect((await row(receiver.p.id))?.giftLeftAt).toBeNull();
  });
});

describe("reportNotFound", () => {
  it("is stored, and only available after the gift is marked", async () => {
    const { giver, receiver } = await pair();
    const { markGift, reportNotFound, getMyGift } = await actions();

    signInAs(receiver.user);
    expect(await reportNotFound(receiver.p.id)).toEqual({
      error: "notMarked",
    });
    expect((await row(receiver.p.id))?.notFoundAt).toBeNull();

    signInAs(giver.user);
    await markGift(input(giver.p.id));
    signInAs(receiver.user);
    expect(await reportNotFound(receiver.p.id)).toEqual({ saved: true });
    const first = (await row(receiver.p.id))?.notFoundAt;
    expect(first).not.toBeNull();
    expect(await getMyGift(receiver.user.id, receiver.p.id)).toMatchObject({
      status: "notFound",
    });

    at("2026-12-28T12:00:00+01:00");
    await reportNotFound(receiver.p.id);
    expect((await row(receiver.p.id))?.notFoundAt).toEqual(first);
  });

  it("is not available to another account or after the close day", async () => {
    const { giver, receiver } = await pair();
    const { markGift, reportNotFound } = await actions();
    signInAs(giver.user);
    await markGift(input(giver.p.id));

    expect(await reportNotFound(giver.p.id)).toEqual({ error: "notMarked" });
    expect(await reportNotFound(receiver.p.id)).toEqual({ error: "notFound" });
    expect(await reportNotFound("nope")).toEqual({ error: "invalid" });

    signInAs(receiver.user);
    at(`${DEFAULT_DATES.closeOn}T12:00:00+01:00`);
    expect(await reportNotFound(receiver.p.id)).toEqual({ error: "closed" });
  });
});

function input(id: string, extra: Record<string, unknown> = {}) {
  return {
    participantId: id,
    place: "locker",
    code: "42",
    note: "enjoy",
    ...extra,
  };
}
