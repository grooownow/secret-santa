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
  vi.useFakeTimers({ toFake: ["Date"] });
  // Between the draw (7 Dec) and the gifts (25 Dec): leaving is possible.
  vi.setSystemTime(new Date("2026-12-10T12:00:00+01:00"));
  sent.length = 0;
  authMock.mockReset();
  await db.delete(sentEmails);
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

async function person(apartment: string, name: string, email?: string) {
  const [user] = await db
    .insert(users)
    .values(
      makeUser({
        ...(email ? { email } : {}),
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
    .values(makeParticipant(user!.id, { name }))
    .returning();
  return { user: user!, id: p!.id };
}

function signIn(user: { id: string; email: string; sessionVersion: number }) {
  authMock.mockResolvedValue({
    user: { id: user.id, email: user.email },
    sessionVersion: user.sessionVersion,
  });
}

/** Three people in a cycle a → b → c → a, plus the organizer's account. */
async function game() {
  const kate = await person("99", "Kate", ORGANIZER_EMAIL);
  const a = await person("1", "Anna");
  const b = await person("2", "Boris");
  const c = await person("3", "Cleo");
  await db.insert(assignments).values([
    { giverId: a.id, receiverId: b.id },
    { giverId: b.id, receiverId: c.id },
    { giverId: c.id, receiverId: a.id },
  ]);
  return { kate, a, b, c };
}

function form(values: Record<string, string>): FormData {
  const data = new FormData();
  for (const [k, v] of Object.entries(values)) data.set(k, v);
  return data;
}

const exitAction = async () =>
  (await import("@/features/profile/exit-request-action")).requestExitAction;

describe("«Не могу участвовать»", () => {
  it("stores the request with the comment and emails the organizer", async () => {
    const { b } = await game();
    signIn(b.user);
    const result = await (
      await exitAction()
    )({}, form({ participantId: b.id, comment: "Away for the holidays" }));
    expect(result).toEqual({ saved: true });
    await flush();

    const [row] = await db
      .select()
      .from(participants)
      .where(eq(participants.id, b.id));
    expect(row?.exitRequestedAt).not.toBeNull();
    expect(row?.exitComment).toBe("Away for the holidays");

    expect(sent).toHaveLength(1);
    expect(sent[0]?.to).toBe(ORGANIZER_EMAIL);
    expect(sent[0]?.text).toContain("Boris");
    expect(sent[0]?.text).toContain("Away for the holidays");
    expect(sent[0]?.text).toContain("/admin/participants");
    // Nothing in the chain changes until the organizer confirms.
    expect(await db.select().from(assignments)).toHaveLength(3);
  });

  it("is refused before the draw window and from 25 December", async () => {
    const { b } = await game();
    signIn(b.user);
    vi.setSystemTime(new Date("2026-12-25T12:00:00+01:00"));
    expect(
      await (
        await exitAction()
      )({}, form({ participantId: b.id, comment: "" })),
    ).toMatchObject({ error: "closed" });
    expect(sent).toHaveLength(0);
  });

  it("only for the account's own participant; comment up to 300 chars", async () => {
    const { a, b } = await game();
    signIn(b.user);
    const act = await exitAction();
    expect(
      await act({}, form({ participantId: a.id, comment: "" })),
    ).toMatchObject({ error: "notFound" });
    expect(
      await act({}, form({ participantId: b.id, comment: "x".repeat(301) })),
    ).toMatchObject({ error: "invalid" });
    const [anna] = await db
      .select()
      .from(participants)
      .where(eq(participants.id, a.id));
    expect(anna?.exitRequestedAt).toBeNull();
  });

  it("shows up in the admin table and the overview count", async () => {
    const { kate, b } = await game();
    signIn(b.user);
    await (
      await exitAction()
    )({}, form({ participantId: b.id, comment: "" }));
    signIn(kate.user);
    const { listParticipantRows, getOverview } =
      await import("@/features/admin");
    const rows = await listParticipantRows();
    expect(rows.find((r) => r.id === b.id)?.exitRequestedAt).not.toBeNull();
    expect(rows.find((r) => r.name === "Anna")?.exitRequestedAt).toBeNull();
    expect((await getOverview()).exitRequests).toBe(1);
  });
});

describe("«Нужна замена» by hand", () => {
  it("puts a receiver on «Помощь» with the reason «manual»", async () => {
    const { kate, c } = await game();
    signIn(kate.user);
    const { markBackupNeeded } =
      await import("@/features/admin/backup-actions");
    const { listBackupNeeded } = await import("@/features/admin");
    expect(await listBackupNeeded()).toHaveLength(0);
    expect(await markBackupNeeded(c.id)).toEqual({ ok: true });
    const list = await listBackupNeeded();
    expect(list.map((e) => [e.name, e.reason])).toEqual([["Cleo", "manual"]]);
    // Twice is a no-op.
    expect(await markBackupNeeded(c.id)).toEqual({ ok: false });
  });

  it("is organizer-only", async () => {
    const { a, c } = await game();
    signIn(a.user);
    const { markBackupNeeded } =
      await import("@/features/admin/backup-actions");
    await expect(markBackupNeeded(c.id)).rejects.toThrow("NEXT_NOT_FOUND");
  });
});

describe("volunteer backup Santas", () => {
  it("a volunteer is asked by email with the receiver's name, flat and wishes", async () => {
    const { kate, c } = await game();
    const vera = await person("7", "Vera");
    signIn(vera.user);
    const { setBackupVolunteer } =
      await import("@/features/account/volunteer-action");
    expect(await setBackupVolunteer(true)).toEqual({ ok: true });

    signIn(kate.user);
    const { markBackupNeeded, assignVolunteer } =
      await import("@/features/admin/backup-actions");
    const { listVolunteers, listBackupNeeded } =
      await import("@/features/admin");
    expect((await listVolunteers()).map((v) => v.name)).toEqual(["Vera"]);
    await markBackupNeeded(c.id);
    expect(
      await assignVolunteer({ participantId: c.id, volunteerId: vera.user.id }),
    ).toEqual({ ok: true });

    expect(sent).toHaveLength(1);
    expect(sent[0]?.to).toBe(vera.user.email);
    expect(sent[0]?.text).toContain("Cleo");
    expect(sent[0]?.text).toContain("Building K, flat 3.");
    // Never who the original Santa was.
    expect(sent[0]?.text).not.toContain("Boris");
    const entry = (await listBackupNeeded()).find(
      (e) => e.participantId === c.id,
    );
    expect(entry?.volunteer).toEqual({ userId: vera.user.id, name: "Vera" });
    // Asking the same volunteer again does not mail twice.
    await assignVolunteer({ participantId: c.id, volunteerId: vera.user.id });
    expect(sent).toHaveLength(1);
  });

  it("refuses non-volunteers and someone from the receiver's flat", async () => {
    const { kate, c } = await game();
    const neighbour = await person("3", "Nina"); // same flat as Cleo
    const stranger = await person("8", "Sam");
    await db
      .update(users)
      .set({ backupVolunteer: true })
      .where(eq(users.id, neighbour.user.id));
    signIn(kate.user);
    const { markBackupNeeded, assignVolunteer } =
      await import("@/features/admin/backup-actions");
    await markBackupNeeded(c.id);
    expect(
      await assignVolunteer({
        participantId: c.id,
        volunteerId: neighbour.user.id,
      }),
    ).toEqual({ ok: false, error: "ownFlat" });
    expect(
      await assignVolunteer({
        participantId: c.id,
        volunteerId: stranger.user.id,
      }),
    ).toEqual({ ok: false, error: "notVolunteer" });
    expect(sent).toHaveLength(0);
  });

  it("only for someone on «Помощь»", async () => {
    const { kate, b } = await game();
    const vera = await person("7", "Vera");
    await db
      .update(users)
      .set({ backupVolunteer: true })
      .where(eq(users.id, vera.user.id));
    signIn(kate.user);
    const { assignVolunteer } = await import("@/features/admin/backup-actions");
    expect(
      await assignVolunteer({ participantId: b.id, volunteerId: vera.user.id }),
    ).toEqual({ ok: false, error: "notNeeded" });
  });
});
