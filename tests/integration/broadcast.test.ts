import { eq } from "drizzle-orm";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { makeParticipant, makeUser } from "@/db/factories";
import { assignments, participants, sentEmails, users } from "@/db/schema";
import {
  broadcastStatus,
  runBroadcast,
  sendOnce,
  setMailTransportForTests,
  type MailMessage,
} from "@/features/mail";
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

const outbox: MailMessage[] = [];
let failOn = new Set<number>();
let calls = 0;

function installTransport() {
  calls = 0;
  setMailTransportForTests(async (m) => {
    calls += 1;
    await new Promise((r) => setTimeout(r, 2));
    if (failOn.has(calls)) throw new Error("gmail down");
    outbox.push(m);
  });
}

afterEach(async () => {
  setMailTransportForTests(null);
  outbox.length = 0;
  failOn = new Set();
  await db.delete(assignments);
  await db.delete(sentEmails);
  await db.delete(users);
});

async function account(
  names: string[],
  locale = "en",
): Promise<{ userId: string; email: string; ids: string[] }> {
  const [u] = await db.insert(users).values(makeUser({ locale })).returning();
  if (!u) throw new Error("user");
  const ids: string[] = [];
  for (const [i, name] of names.entries()) {
    const [p] = await db
      .insert(participants)
      .values(
        makeParticipant(u.id, { name, kind: i === 0 ? "adult" : "child" }),
      )
      .returning();
    if (!p) throw new Error("participant");
    ids.push(p.id);
  }
  return { userId: u.id, email: u.email, ids };
}

async function chain(ids: string[], leftAt: Date[] = []) {
  // ids[i] gives to ids[i+1]; the last gives to the first.
  for (const [i, giver] of ids.entries()) {
    const receiver = ids[(i + 1) % ids.length]!;
    await db.insert(assignments).values({
      receiverId: receiver,
      giverId: giver,
      giftLeftAt: leftAt[i] ?? null,
    });
  }
}

describe("runBroadcast", () => {
  it("sends one email per account, listing its participants, in its language", async () => {
    const a = await account(["Ana", "Leo"], "ru");
    const b = await account(["Bo"], "de");
    const c = await account(["Cy"]);
    await account(["Outsider"]); // not in the draw
    await chain([a.ids[0]!, b.ids[0]!, c.ids[0]!, a.ids[1]!]);
    installTransport();

    expect(await runBroadcast("draw")).toEqual({
      total: 3,
      sent: 3,
      failed: 0,
    });

    expect(outbox).toHaveLength(3);
    const toA = outbox.find((m) => m.to === a.email)!;
    expect(toA.subject).toBe("Жеребьёвка прошла");
    expect(toA.text).toContain("Ana и Leo");
    expect(outbox.find((m) => m.to === b.email)!.subject).toBe(
      "Die Auslosung ist erfolgt",
    );
    // Pairs never leak: Bo's mail does not mention Cy or Ana.
    const toB = outbox.find((m) => m.to === b.email)!;
    expect(toB.text + toB.html).not.toMatch(/Cy|Ana|Leo/);
  });

  it("after a transport failure, a rerun sends only the unsent", async () => {
    const accounts = [
      await account(["A"]),
      await account(["B"]),
      await account(["C"]),
    ];
    await chain(accounts.map((x) => x.ids[0]!));
    failOn = new Set([2]);
    installTransport();

    expect(await runBroadcast("draw")).toMatchObject({
      total: 3,
      sent: 2,
      failed: 1,
    });
    expect(await broadcastStatus("draw")).toEqual({ total: 3, sent: 2 });

    failOn = new Set();
    expect(await runBroadcast("draw")).toMatchObject({ sent: 1, failed: 0 });
    expect(await broadcastStatus("draw")).toEqual({ total: 3, sent: 3 });

    const recipients = outbox.map((m) => m.to).sort();
    expect(recipients).toEqual(accounts.map((x) => x.email).sort());
    expect(new Set(recipients).size).toBe(recipients.length);

    expect(await runBroadcast("draw")).toMatchObject({ sent: 0, failed: 0 });
    expect(outbox).toHaveLength(3);
  });

  it("two parallel broadcasts mail each account exactly once", async () => {
    const accounts = [
      await account(["A"]),
      await account(["B"]),
      await account(["C"]),
    ];
    await chain(accounts.map((x) => x.ids[0]!));
    installTransport();

    const [r1, r2] = await Promise.all([
      runBroadcast("draw"),
      runBroadcast("draw"),
    ]);

    expect(r1.sent + r2.sent).toBe(3);
    expect(outbox.map((m) => m.to).sort()).toEqual(
      accounts.map((x) => x.email).sort(),
    );
  });

  it("reminder goes only to accounts with an unmarked gift", async () => {
    const a = await account(["A"]);
    const b = await account(["B"]);
    const c = await account(["C"]);
    // A gives (left), B gives (not left), C gives (not left) but C's gift is
    // the one A receives... only givers with giftLeftAt null are reminded.
    await chain([a.ids[0]!, b.ids[0]!, c.ids[0]!]);
    // giftLeftAt lives on the receiver row: mark the row where A is giver.
    await db
      .update(assignments)
      .set({ giftLeftAt: new Date() })
      .where(eq(assignments.giverId, a.ids[0]!));
    installTransport();

    expect(await runBroadcast("reminder")).toMatchObject({ total: 2, sent: 2 });
    expect(outbox.map((m) => m.to).sort()).toEqual([b.email, c.email].sort());
  });

  it("covers a dropped-out giver's receiver but skips rows without a giver for reminders", async () => {
    const a = await account(["A"]);
    const b = await account(["B"]);
    await db
      .insert(assignments)
      .values({ receiverId: a.ids[0]!, giverId: b.ids[0]! });
    await db
      .insert(assignments)
      .values({ receiverId: b.ids[0]!, giverId: null });
    installTransport();

    expect(await runBroadcast("reminder")).toMatchObject({ total: 1, sent: 1 });
    expect(outbox[0]?.to).toBe(b.email);
    expect(await broadcastStatus("reveal")).toEqual({ total: 2, sent: 0 });
  });
});

describe("sendOnce", () => {
  it("sends once per key and records the key only after success", async () => {
    const msg = { to: "x@y.dev", subject: "s", text: "t", html: "h" };
    failOn = new Set([1]);
    installTransport();

    await expect(sendOnce("k:1", msg)).rejects.toThrow("gmail down");
    expect(await db.select().from(sentEmails)).toHaveLength(0);

    expect(await sendOnce("k:1", msg)).toBe(true);
    expect(await sendOnce("k:1", msg)).toBe(false);
    expect(outbox).toHaveLength(1);
    expect(await db.select().from(sentEmails)).toHaveLength(1);
  });

  it("parallel sendOnce on one key sends once", async () => {
    const msg = { to: "x@y.dev", subject: "s", text: "t", html: "h" };
    installTransport();
    const results = await Promise.all([
      sendOnce("p:1", msg),
      sendOnce("p:1", msg),
      sendOnce("p:1", msg),
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(outbox).toHaveLength(1);
  });

  it("a failed send leaves no claim", async () => {
    const msg = { to: "x@y.dev", subject: "s", text: "t", html: "h" };
    failOn = new Set([1]);
    installTransport();
    await expect(sendOnce("f:1", msg)).rejects.toThrow();
    expect(await db.select().from(sentEmails)).toHaveLength(0);
  });

  it("does not reclaim a fresh claim but reclaims a stale one", async () => {
    const msg = { to: "x@y.dev", subject: "s", text: "t", html: "h" };
    installTransport();
    await db.insert(sentEmails).values({ key: "c:1" }); // fresh, unsent
    expect(await sendOnce("c:1", msg)).toBe(false);
    expect(outbox).toHaveLength(0);

    await db
      .update(sentEmails)
      .set({ claimedAt: new Date(Date.now() - 11 * 60 * 1000) });
    const results = await Promise.all([
      sendOnce("c:1", msg),
      sendOnce("c:1", msg),
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(outbox).toHaveLength(1);
    const [row] = await db.select().from(sentEmails);
    expect(row?.sentAt).not.toBeNull();
  });

  it("an unfinished claim does not count as sent in the status", async () => {
    const a = await account(["A"]);
    const b = await account(["B"]);
    await chain([a.ids[0]!, b.ids[0]!]);
    await db.insert(sentEmails).values({ key: `draw:${a.userId}` });
    expect(await broadcastStatus("draw")).toEqual({ total: 2, sent: 0 });
  });
});
