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
  participants,
  settings,
  translations,
  users,
  wallPosts,
} from "@/db/schema";
import { setTranslatorForTests } from "@/features/translation";
import { setRunAfterResponseForTests } from "@/lib/run-after-response";
import { createTestDb, type TestDb } from "./helpers/test-db";

let db: TestDb;
let cleanup: () => Promise<void>;
const authMock = vi.fn();
const deferred: Promise<unknown>[] = [];

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
vi.mock("@/lib/env", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/env")>();
  return { env: { ...original.env, ADMIN_EMAIL: "kate@example.dev" } };
});

beforeAll(async () => {
  ({ db, cleanup } = await createTestDb());
  setRunAfterResponseForTests((work) => {
    deferred.push(Promise.resolve().then(work));
  });
});
afterAll(async () => {
  setRunAfterResponseForTests(null);
  await cleanup();
});
beforeEach(async () => {
  jar.clear();
  authMock.mockReset();
  setTranslatorForTests({
    async translate(text, _from, to) {
      return Object.fromEntries(to.map((l) => [l, `[${l}] ${text}`]));
    },
  });
  await db.delete(translations);
  await db.delete(wallPosts);
  await db.delete(participants);
  await db.delete(users);
  await db.delete(settings);
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-12-26T12:00:00+01:00"));
});
afterEach(async () => {
  await flush();
  vi.useRealTimers();
  setTranslatorForTests(null);
});

async function person(
  name: string,
  overrides: Partial<typeof users.$inferInsert> = {},
) {
  const [user] = await db
    .insert(users)
    .values(
      makeUser({
        emailVerified: new Date(),
        consentAt: new Date(),
        locale: "ru",
        building: "K",
        apartment: "77",
        ...overrides,
      }),
    )
    .returning();
  if (!user) throw new Error("no user");
  const [p] = await db
    .insert(participants)
    .values(makeParticipant(user.id, { name }))
    .returning();
  if (!p) throw new Error("no participant");
  return { user, p };
}

function signInAs(user: { id: string; email: string; sessionVersion: number }) {
  authMock.mockResolvedValue({
    user: { id: user.id, email: user.email },
    sessionVersion: user.sessionVersion,
  });
}

const wall = () => import("@/features/wall");
const at = (iso: string) => vi.setSystemTime(new Date(iso));

function postForm(text: string, photo?: File) {
  const fd = new FormData();
  fd.set("text", text);
  if (photo) fd.set("photo", photo);
  return fd;
}

async function flush() {
  await Promise.all(deferred.splice(0));
}

async function addAs(
  who: { user: Parameters<typeof signInAs>[0]; p: { id: string } },
  text: string,
  photo?: File,
) {
  signInAs(who.user);
  jar.set("participant", who.p.id);
  const { addPost } = await wall();
  const state = await addPost({}, postForm(text, photo));
  expect(state.error).toBeUndefined();
  const [row] = await db
    .select()
    .from(wallPosts)
    .where(eq(wallPosts.participantId, who.p.id));
  if (!row) throw new Error("post missing");
  return row;
}

describe("adding a post", () => {
  it("posting works only while the wall is open", async () => {
    const ann = await person("Ann");
    signInAs(ann.user);
    const { addPost } = await wall();

    at("2026-12-24T12:00:00+01:00");
    expect((await addPost({}, postForm("too early"))).error).toBe("closed");

    at("2026-12-25T00:30:00+01:00");
    expect((await addPost({}, postForm("first"))).posted).toBe(true);

    at("2027-01-09T23:00:00+01:00");
    expect((await addPost({}, postForm("last day"))).posted).toBe(true);

    at("2027-01-10T08:00:00+01:00");
    expect((await addPost({}, postForm("too late"))).error).toBe("closed");

    const rows = await db.select().from(wallPosts);
    expect(rows.map((r) => r.text).toSorted()).toEqual(["first", "last day"]);
  });

  it("post text is 1–1000 chars", async () => {
    const ann = await person("Ann");
    signInAs(ann.user);
    const { addPost } = await wall();
    expect((await addPost({}, postForm("   "))).error).toBe("invalid");
    expect((await addPost({}, postForm("x".repeat(1001)))).error).toBe(
      "invalid",
    );
    const bad = await addPost({}, postForm("x".repeat(1001)));
    expect(bad.text).toHaveLength(1001);
    expect((await addPost({}, postForm("x".repeat(1000)))).posted).toBe(true);
    expect((await addPost({}, postForm("x"))).posted).toBe(true);
  });

  it("stores an optional photo and rejects a bad one, keeping the text", async () => {
    const ann = await person("Ann");
    signInAs(ann.user);
    const { addPost } = await wall();
    const ok = new File([new Uint8Array(10)], "p.jpg", { type: "image/jpeg" });
    expect((await addPost({}, postForm("with photo", ok))).posted).toBe(true);
    const gif = new File([new Uint8Array(10)], "p.gif", { type: "image/gif" });
    const state = await addPost({}, postForm("bad photo", gif));
    expect(state).toMatchObject({ error: "photo", text: "bad photo" });
    const huge = new File([new Uint8Array(901 * 1024)], "p.jpg", {
      type: "image/jpeg",
    });
    expect((await addPost({}, postForm("huge", huge))).error).toBe(
      "photoTooLarge",
    );
    const rows = await db.select().from(wallPosts);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.photoUrl).toMatch(/^data:image\/jpeg;base64,/);
  });

  it("is authored by the current participant and translated", async () => {
    const ann = await person("Ann");
    const [kid] = await db
      .insert(participants)
      .values(makeParticipant(ann.user.id, { name: "Kid", kind: "child" }))
      .returning();
    signInAs(ann.user);
    jar.set("participant", kid?.id ?? "");
    const { addPost } = await wall();
    await addPost({}, postForm("Спасибо!"));
    await flush();
    const [row] = await db.select().from(wallPosts);
    expect(row?.participantId).toBe(kid?.id);
    const tr = await db.select().from(translations);
    expect(tr.map((t) => t.locale).toSorted()).toEqual([
      "de",
      "en",
      "es",
      "uk",
    ]);
  });

  it("needs a participant", async () => {
    const [user] = await db
      .insert(users)
      .values(makeUser({ emailVerified: new Date(), consentAt: new Date() }))
      .returning();
    if (!user) throw new Error("no user");
    signInAs(user);
    const { addPost } = await wall();
    expect((await addPost({}, postForm("hi"))).error).toBe("noParticipant");
  });
});

describe("deleting a post", () => {
  it("author deletes own post, others cannot, organizer can", async () => {
    const ann = await person("Ann");
    const bob = await person("Bob");
    const kate = await person("Kate", { email: "kate@example.dev" });
    const photo = new File([new Uint8Array(10)], "p.jpg", {
      type: "image/jpeg",
    });
    const annPost = await addAs(ann, "from Ann", photo);
    await flush();
    const bobPost = await addAs(bob, "from Bob");
    await flush();
    const { deletePost } = await wall();

    signInAs(bob.user);
    expect((await deletePost(annPost.id)).error).toBe("notFound");
    expect(await db.select().from(wallPosts)).toHaveLength(2);

    signInAs(ann.user);
    expect((await deletePost("not-a-uuid")).error).toBe("notFound");
    expect((await deletePost(annPost.id)).deleted).toBe(true);
    expect(await db.select().from(wallPosts)).toHaveLength(1);
    const left = await db.select().from(translations);
    expect(left.every((t) => t.sourceKey === `post:${bobPost.id}`)).toBe(true);
    expect(left.length).toBeGreaterThan(0);

    signInAs(kate.user);
    expect((await deletePost(bobPost.id)).deleted).toBe(true);
    expect(await db.select().from(wallPosts)).toHaveLength(0);
    expect(await db.select().from(translations)).toHaveLength(0);
  });
});

describe("feed", () => {
  it("lists newest first and exposes author name but no apartment or email", async () => {
    const ann = await person("Ann", { apartment: "77", building: "K" });
    const bob = await person("Bob");
    await addAs(ann, "older");
    at("2026-12-27T12:00:00+01:00");
    await addAs(bob, "newer");
    const { listPosts } = await wall();
    const posts = await listPosts({ userId: ann.user.id, organizer: false });
    expect(posts.map((p) => p.text)).toEqual(["newer", "older"]);
    expect(posts.map((p) => p.authorName)).toEqual(["Bob", "Ann"]);
    expect(posts.map((p) => p.canDelete)).toEqual([false, true]);
    const dump = JSON.stringify(posts);
    expect(dump).not.toContain(ann.user.email);
    expect(dump).not.toContain("77");
    expect(Object.keys(posts[0] ?? {}).toSorted()).toEqual([
      "authorLocale",
      "authorName",
      "canDelete",
      "createdAt",
      "id",
      "photoUrl",
      "text",
    ]);
  });

  it("organizer can delete every post", async () => {
    const ann = await person("Ann");
    await addAs(ann, "hi");
    const { listPosts } = await wall();
    const posts = await listPosts({ userId: "someone-else", organizer: true });
    expect(posts[0]?.canDelete).toBe(true);
  });
});
