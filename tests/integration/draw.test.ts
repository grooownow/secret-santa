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
import { setMailTransportForTests, type MailMessage } from "@/features/mail";
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
  // Let a broadcast left over from the previous test finish before cleaning.
  await flush();
  sent.length = 0;
  authMock.mockReset();
  await db.delete(sentEmails);
  await db.delete(assignments);
  await db.delete(participants);
  await db.delete(users);
  await db.delete(settings);
});

function signInAs(user: { id: string; email: string; sessionVersion: number }) {
  authMock.mockResolvedValue({
    user: { id: user.id, email: user.email },
    sessionVersion: user.sessionVersion,
  });
}

/** An account with an adult plus `children`; flat is `K` + apartment. */
async function account(
  apartment: string,
  children = 0,
  overrides: Partial<typeof users.$inferInsert> = {},
) {
  const [user] = await db
    .insert(users)
    .values(
      makeUser({
        emailVerified: new Date(),
        consentAt: new Date(),
        locale: "en",
        building: "K",
        apartment,
        ...overrides,
      }),
    )
    .returning();
  if (!user) throw new Error("no user");
  const ids: string[] = [];
  for (let i = 0; i <= children; i += 1) {
    // oxlint-disable-next-line no-await-in-loop
    const [p] = await db
      .insert(participants)
      .values(makeParticipant(user.id, { kind: i === 0 ? "adult" : "child" }))
      .returning();
    if (!p) throw new Error("no participant");
    ids.push(p.id);
  }
  return { user, ids };
}

async function organizer(apartment = "1") {
  const made = await account(apartment, 0, { email: ORGANIZER_EMAIL });
  signInAs(made.user);
  return made;
}

async function draw() {
  const { runDraw } = await import("@/features/draw");
  return runDraw();
}

async function drawnAt() {
  const [row] = await db.select().from(settings);
  return row?.drawnAt ?? null;
}

describe("runDraw", () => {
  it("double click runs one draw and one broadcast", async () => {
    await organizer("1");
    const accounts = [
      await account("2", 1),
      await account("3"),
      await account("4", 2),
      await account("5"),
    ];
    const participantCount = 1 + 2 + 1 + 3 + 1;

    const results = await Promise.all([draw(), draw()]);
    await flush();

    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.find((r) => !r.ok)).toMatchObject({
      reason: "already_drawn",
    });
    expect(await db.select().from(assignments)).toHaveLength(participantCount);
    expect(await drawnAt()).not.toBeNull();
    expect(sent).toHaveLength(accounts.length + 1);
  });

  it("builds one chain where same-account and same-flat people never meet", async () => {
    await organizer("2b");
    await account("2 B");
    await account("2-B");
    await account("7", 1);
    await account("9");
    await account("11");
    const flats = new Map<string, string>();
    for (const row of await db
      .select({ id: participants.id, apartment: users.apartment })
      .from(participants)
      .innerJoin(users, eq(users.id, participants.userId))) {
      flats.set(
        row.id,
        (row.apartment ?? "").toUpperCase().replace(/[\s-]+/g, ""),
      );
    }

    expect(await draw()).toMatchObject({ ok: true });

    const rows = await db.select().from(assignments);
    expect(rows).toHaveLength(flats.size);
    const next = new Map(rows.map((r) => [r.giverId!, r.receiverId]));
    for (const r of rows) {
      expect(flats.get(r.giverId!)).not.toBe(flats.get(r.receiverId));
    }
    let cur = rows[0]!.giverId!;
    const seen = new Set<string>();
    while (!seen.has(cur)) {
      seen.add(cur);
      cur = next.get(cur)!;
    }
    expect(seen.size).toBe(flats.size);
  });

  it("failed draw saves nothing", async () => {
    await organizer("1");
    await account("2");

    expect(await draw()).toEqual({ ok: false, reason: "too_few" });
    await flush();

    expect(await db.select().from(assignments)).toHaveLength(0);
    expect(await drawnAt()).toBeNull();
    expect(sent).toHaveLength(0);
  });

  it("a flat above half fails and names the flat", async () => {
    await organizer("1");
    await account("12", 3);
    await account("3");

    expect(await draw()).toEqual({
      ok: false,
      reason: "household_too_large",
      flat: "K:12",
    });
    expect(await db.select().from(assignments)).toHaveLength(0);
    expect(await drawnAt()).toBeNull();
  });

  it("unverified accounts stay out and are counted (per account) as excluded", async () => {
    await organizer("1");
    await account("2");
    await account("3");
    const stranger = await account("4", 1, { emailVerified: null });
    // Registered, never confirmed, no profile: the usual unverified case.
    await db
      .insert(users)
      .values([
        makeUser({ email: "pending1@example.com", emailVerified: null }),
        makeUser({ email: "pending2@example.com", emailVerified: null }),
      ]);

    const { getOverview } = await import("@/features/admin");
    expect(await getOverview()).toMatchObject({
      phase: "collect",
      participants: 3,
      excluded: 3,
    });

    expect(await draw()).toMatchObject({ ok: true, links: 3 });
    await flush();
    const inChain = new Set(
      (await db.select().from(assignments)).flatMap((a) => [
        a.receiverId,
        a.giverId,
      ]),
    );
    for (const id of stranger.ids) expect(inChain.has(id)).toBe(false);
    expect(sent.map((m) => m.to)).not.toContain(stranger.user.email);
    expect(await getOverview()).toMatchObject({
      phase: "waiting",
      participants: 3,
      excluded: 3,
    });
  });

  it("closed registration: nothing runs once the game is over", async () => {
    await organizer("1");
    await account("2");
    await account("3");
    await db.insert(settings).values({
      id: 1,
      applicationsCloseOn: "2020-01-01",
      drawOn: "2020-01-02",
      giftsStartOn: "2020-01-03",
      giftsEndOn: "2020-01-04",
      revealOn: "2020-01-05",
      closeOn: "2020-01-06",
    });
    expect(await draw()).toEqual({ ok: false, reason: "closed" });
    expect(await db.select().from(assignments)).toHaveLength(0);
  });

  it("non-organizer gets not found", async () => {
    await organizer("1");
    const guest = await account("2");
    signInAs(guest.user);

    await expect(draw()).rejects.toThrow("NEXT_NOT_FOUND");
    const { getOverview } = await import("@/features/admin");
    await expect(getOverview()).rejects.toThrow("NEXT_NOT_FOUND");
    const { resendBroadcast } = await import("@/features/admin");
    await expect(resendBroadcast("draw")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(await drawnAt()).toBeNull();
  });
});

describe("overview and resend", () => {
  it("overview payload has no giver or receiver", async () => {
    await organizer("1");
    await account("2");
    await account("3");
    await draw();
    await flush();

    const { getOverview } = await import("@/features/admin");
    const overview = await getOverview();
    const text = JSON.stringify(overview);
    expect(text).not.toMatch(/giver|receiver/i);
    const ids = (await db.select().from(participants)).map((p) => p.id);
    for (const id of ids) expect(text).not.toContain(id);
    expect(Object.keys(overview).sort()).toEqual([
      "backupNeeded",
      "backupOrganized",
      "broadcasts",
      // A count of children in the chain: no names, ids or pairs.
      "children",
      "excluded",
      "giftsMarked",
      "participants",
      "phase",
    ]);
  });

  it("a mail failure keeps the chain; resend sends only the rest", async () => {
    await organizer("1");
    await account("2");
    await account("3");
    let calls = 0;
    setMailTransportForTests(async (m) => {
      calls += 1;
      if (calls === 2) throw new Error("gmail down");
      sent.push(m);
    });

    expect(await draw()).toMatchObject({ ok: true });
    await flush();
    expect(await db.select().from(assignments)).toHaveLength(3);

    const { getOverview } = await import("@/features/admin");
    expect((await getOverview()).broadcasts.draw).toEqual({
      total: 3,
      sent: 2,
    });

    const { resendBroadcast } = await import("@/features/admin");
    expect(await resendBroadcast("draw")).toMatchObject({
      sent: 1,
      failed: 0,
    });
    expect((await getOverview()).broadcasts.draw).toEqual({
      total: 3,
      sent: 3,
    });
    expect(new Set(sent.map((m) => m.to)).size).toBe(3);
    expect(sent).toHaveLength(3);
    setMailTransportForTests(async (m) => {
      sent.push(m);
    });
  });

  it("resend before the draw sends nothing", async () => {
    await organizer("1");
    await account("2");
    const { resendBroadcast } = await import("@/features/admin");
    expect(await resendBroadcast("draw")).toEqual({
      total: 0,
      sent: 0,
      failed: 0,
    });
    expect(sent).toHaveLength(0);
  });
});
