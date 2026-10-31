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
import { makeParticipant, makeUser } from "@/db/factories";
import {
  assignments,
  participants,
  sentEmails,
  settings,
  users,
} from "@/db/schema";
import { setMailTransportForTests } from "@/features/mail";
import { setRunAfterResponseForTests } from "@/lib/run-after-response";
import { createTestDb, type TestDb } from "./helpers/test-db";

const deferred: Promise<unknown>[] = [];
let db: TestDb;
let cleanup: () => Promise<void>;
const authMock = vi.fn();

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
// The outer (unlocked) gate says "open": this is what a request that passed
// it just before the draw committed sees. Only the in-transaction check, under
// the settings lock, can still refuse it.
vi.mock("@/features/profile/edit-gate", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/features/profile/edit-gate")>();
  return {
    ...original,
    canCreate: async () => true,
    canEdit: async () => true,
  };
});

beforeAll(async () => {
  ({ db, cleanup } = await createTestDb());
  setMailTransportForTests(async () => {});
  setRunAfterResponseForTests((work) => {
    deferred.push(Promise.resolve().then(work));
  });
});
afterAll(async () => {
  await Promise.all(deferred);
  setMailTransportForTests(null);
  setRunAfterResponseForTests(null);
  await cleanup();
});
beforeEach(async () => {
  await Promise.all(deferred.splice(0));
  await db.delete(sentEmails);
  await db.delete(assignments);
  await db.delete(participants);
  await db.delete(users);
  await db.delete(settings);
});

async function account(email?: string) {
  const [user] = await db
    .insert(users)
    .values(
      makeUser({
        ...(email ? { email } : {}),
        emailVerified: new Date(),
        consentAt: new Date(),
        building: "K",
        apartment: String(Math.floor(Math.random() * 1e6)),
      }),
    )
    .returning();
  const [person] = await db
    .insert(participants)
    .values(makeParticipant(user!.id, { name: "Before" }))
    .returning();
  return { user: user!, person: person! };
}

function as(user: { id: string; email: string; sessionVersion: number }) {
  authMock.mockResolvedValue({
    user: { id: user.id, email: user.email },
    sessionVersion: user.sessionVersion,
  });
}

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
}

describe("profile writes that lost the race with the draw", () => {
  let late: Awaited<ReturnType<typeof account>>;
  let childId: string;

  beforeEach(async () => {
    await account("kate@example.dev").then((a) => as(a.user));
    await account();
    await account();
    late = await account();
    const [child] = await db
      .insert(participants)
      .values(makeParticipant(late.user.id, { kind: "child", name: "Kid" }))
      .returning();
    childId = child!.id;
    const { runDraw } = await import("@/features/draw");
    expect(await runDraw()).toMatchObject({ ok: true });
    as(late.user);
  });

  const names = async () =>
    (await db.select().from(participants)).map((p) => p.name).sort();

  it("save of the owner profile is refused and writes nothing", async () => {
    const { saveAdultAction } =
      await import("@/features/profile/save-adult-action");
    const before = await names();
    const state = await saveAdultAction(
      {},
      form({ name: "After", building: "B", apartment: "9" }),
    );
    expect(state.error).toBe("closed");
    expect(await names()).toEqual(before);
    const [u] = await db.select().from(users).where(eq(users.id, late.user.id));
    expect(u?.building).toBe("K");
  });

  it("adding and editing a child are refused", async () => {
    const { saveChildAction } =
      await import("@/features/profile/save-child-action");
    const before = await names();
    const created = await saveChildAction(
      {},
      form({ name: "New kid", age: "5", guardian: "on" }),
    );
    const edited = await saveChildAction(
      {},
      form({ id: childId, name: "Renamed", age: "5", guardian: "on" }),
    );
    expect(created.error).toBe("closed");
    expect(edited.error).toBe("closed");
    expect(await names()).toEqual(before);
  });

  it("deleting a participant is refused and the chain stays whole", async () => {
    const { deleteParticipantAction } =
      await import("@/features/profile/delete-participant-action");
    const state = await deleteParticipantAction(
      {},
      form({ id: late.person.id }),
    );
    expect(state.error).toBe("closed");
    expect(await db.select().from(participants)).toHaveLength(5);
    expect(await db.select().from(assignments)).toHaveLength(5);
  });
});
