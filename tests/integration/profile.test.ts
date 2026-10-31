import { readFileSync } from "node:fs";
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
import { participants, sentEmails, settings, users } from "@/db/schema";
import { setMailTransportForTests, type MailMessage } from "@/features/mail";
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
  sent.length = 0;
  authMock.mockReset();
  await db.delete(sentEmails);
  await db.delete(participants);
  await db.delete(users);
  await db.delete(settings);
});

async function signedInUser(
  overrides: Partial<typeof users.$inferInsert> = {},
) {
  const [user] = await db
    .insert(users)
    .values(
      makeUser({
        emailVerified: new Date(),
        consentAt: new Date(),
        locale: "ru",
        ...overrides,
      }),
    )
    .returning();
  if (!user) throw new Error("no user");
  authMock.mockResolvedValue({
    user: { id: user.id, email: user.email },
    sessionVersion: user.sessionVersion,
  });
  return user;
}

function form(fields: Record<string, string | Blob>): FormData {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
}

const adultFields = {
  name: "Anna",
  building: "K",
  apartment: "24",
  wishes: "books",
  avoid: "nuts",
};

const childFields = {
  name: "Misha",
  age: "8",
  wishes: "lego",
  avoid: "",
  guardian: "on",
};

async function redirectTarget(run: () => Promise<unknown>): Promise<string> {
  const error: unknown = await run().then(
    () => undefined,
    (e: unknown) => e,
  );
  const digest = (error as { digest?: string } | undefined)?.digest;
  if (!digest?.startsWith("NEXT_REDIRECT")) {
    throw new Error(`expected a redirect, got ${String(error)}`);
  }
  return digest.split(";")[2] ?? "";
}

async function saveAdult(fields: Record<string, string | Blob> = adultFields) {
  const { saveAdultAction } =
    await import("@/features/profile/save-adult-action");
  return saveAdultAction({}, form(fields));
}

async function saveChild(fields: Record<string, string | Blob>) {
  const { saveChildAction } =
    await import("@/features/profile/save-child-action");
  return saveChildAction({}, form(fields));
}

async function deleteParticipant(id: string) {
  const { deleteParticipantAction } =
    await import("@/features/profile/delete-participant-action");
  return deleteParticipantAction({}, form({ id }));
}

async function drawHappened() {
  const drawnAt = new Date();
  await db
    .insert(settings)
    .values({
      id: 1,
      applicationsCloseOn: "2026-12-06",
      drawOn: "2026-12-07",
      giftsStartOn: "2026-12-25",
      giftsEndOn: "2026-12-31",
      revealOn: "2027-01-01",
      closeOn: "2027-01-10",
      drawnAt,
    })
    .onConflictDoUpdate({ target: settings.id, set: { drawnAt } });
}

async function childRow() {
  const [child] = await db
    .select()
    .from(participants)
    .where(eq(participants.kind, "child"));
  return child;
}

describe("owner profile", () => {
  it("saves the profile and the address on the account", async () => {
    const user = await signedInUser();
    expect(await redirectTarget(() => saveAdult())).toBe("/home");

    const [person] = await db.select().from(participants);
    expect(person).toMatchObject({
      kind: "adult",
      name: "Anna",
      wishes: "books",
      avoid: "nuts",
      userId: user.id,
    });
    const [row] = await db.select().from(users).where(eq(users.id, user.id));
    expect(row).toMatchObject({ building: "K", apartment: "24" });
  });

  it("second adult on one account is rejected", async () => {
    const user = await signedInUser();
    await redirectTarget(() => saveAdult());
    await redirectTarget(() => saveAdult({ ...adultFields, name: "Anna 2" }));
    const rows = await db.select().from(participants);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.name).toBe("Anna 2");

    // The database itself refuses a second adult as well.
    await expect(
      db.insert(participants).values(makeParticipant(user.id)),
    ).rejects.toThrow();
  });

  it("first saved adult sends the application email once", async () => {
    await signedInUser();
    await redirectTarget(() => saveAdult());
    await flush();
    expect(sent).toHaveLength(1);
    expect(sent[0]?.subject).toBe("Заявка принята");

    await redirectTarget(() => saveAdult({ ...adultFields, name: "Anna B" }));
    await flush();
    expect(sent).toHaveLength(1);
  });

  it("age must be 0–17", async () => {
    await signedInUser();
    await redirectTarget(() => saveAdult());
    for (const age of ["18", "-1", "", "abc", "1.5", "100"]) {
      // oxlint-disable-next-line no-await-in-loop
      expect((await saveChild({ ...childFields, age })).error).toBe("invalid");
    }
    for (const age of ["0", "17"]) {
      // oxlint-disable-next-line no-await-in-loop
      await redirectTarget(() => saveChild({ ...childFields, age }));
    }
  });

  it("keeps the typed text when the save fails", async () => {
    await signedInUser();
    const state = await saveAdult({ ...adultFields, building: "X" });
    expect(state.error).toBe("invalid");
    expect(state.values).toMatchObject({ name: "Anna", wishes: "books" });
  });

  it("server rejects a payload over 900 KB as a guard", async () => {
    await signedInUser();
    const big = new File([new Uint8Array(901 * 1024)], "p.jpg", {
      type: "image/jpeg",
    });
    const state = await saveAdult({ ...adultFields, photo: big });
    expect(state.error).toBe("photoTooLarge");
    expect(await db.select().from(participants)).toHaveLength(0);
  });

  it("stores a compressed photo as a data URL without a blob token", async () => {
    await signedInUser();
    const small = new File([new Uint8Array(1000)], "photo.jpg", {
      type: "image/jpeg",
    });
    await redirectTarget(() => saveAdult({ ...adultFields, photo: small }));
    const [person] = await db.select().from(participants);
    expect(person?.photoUrl).toMatch(/^data:image\/jpeg;base64,/);
  });

  it("removes the saved photo on request", async () => {
    await signedInUser();
    const small = new File([new Uint8Array(10)], "photo.jpg", {
      type: "image/jpeg",
    });
    await redirectTarget(() => saveAdult({ ...adultFields, photo: small }));
    await redirectTarget(() =>
      saveAdult({ ...adultFields, removePhoto: "on" }),
    );
    const [person] = await db.select().from(participants);
    expect(person?.photoUrl).toBeNull();
  });
});

describe("children", () => {
  it("children cannot be added before the owner's profile", async () => {
    await signedInUser();
    const state = await saveChild(childFields);
    expect(state.error).toBe("noOwner");
    expect(await db.select().from(participants)).toHaveLength(0);
  });

  it("child without guardian confirmation is rejected", async () => {
    await signedInUser();
    await redirectTarget(() => saveAdult());
    const { guardian: _guardian, ...withoutConsent } = childFields;
    expect((await saveChild(withoutConsent)).error).toBe("consent");
    expect(await db.select().from(participants)).toHaveLength(1);
  });

  it("child form has no photo field and an action ignores a photo", async () => {
    await signedInUser();
    await redirectTarget(() => saveAdult());
    const photo = new File([new Uint8Array(10)], "p.jpg", {
      type: "image/jpeg",
    });
    await redirectTarget(() => saveChild({ ...childFields, photo }));
    const child = await childRow();
    expect(child?.photoUrl).toBeNull();
    expect(child?.childConsentAt).toBeInstanceOf(Date);

    const source = readFileSync("src/features/profile/child-form.tsx", "utf8");
    expect(source).not.toMatch(/PhotoInput|type="file"/);
  });
});

describe("access and phases", () => {
  it("editing is rejected after collect", async () => {
    await signedInUser();
    await redirectTarget(() => saveAdult());
    await redirectTarget(() => saveChild(childFields));
    const child = await childRow();
    await drawHappened();

    expect((await saveAdult({ ...adultFields, name: "New" })).error).toBe(
      "closed",
    );
    expect(
      (await saveChild({ ...childFields, id: child?.id ?? "", name: "X" }))
        .error,
    ).toBe("closed");
    expect((await deleteParticipant(child?.id ?? "")).error).toBe("closed");
    expect(await db.select().from(participants)).toHaveLength(2);
  });

  it("cannot edit another account's participant", async () => {
    const other = await signedInUser();
    await redirectTarget(() => saveAdult());
    const [victim] = await db
      .select()
      .from(participants)
      .where(eq(participants.userId, other.id));

    const me = await signedInUser();
    await redirectTarget(() => saveAdult({ ...adultFields, name: "Mine" }));
    expect(
      (await saveChild({ ...childFields, id: victim?.id ?? "", name: "Hack" }))
        .error,
    ).toBe("notFound");
    expect((await deleteParticipant(victim?.id ?? "")).error).toBe("notFound");

    const { getOwnParticipant } = await import("@/features/profile/queries");
    expect(await getOwnParticipant(me.id, victim?.id ?? "")).toBeNull();
    const [still] = await db
      .select()
      .from(participants)
      .where(eq(participants.id, victim?.id ?? ""));
    expect(still?.name).toBe("Anna");
  });

  it("deleting the owner's profile also deletes the children", async () => {
    await signedInUser();
    await redirectTarget(() => saveAdult());
    await redirectTarget(() => saveChild(childFields));
    const [owner] = await db
      .select()
      .from(participants)
      .where(eq(participants.kind, "adult"));
    await redirectTarget(() => deleteParticipant(owner?.id ?? ""));
    expect(await db.select().from(participants)).toHaveLength(0);
  });

  it("an unverified account is sent to confirm the email", async () => {
    await signedInUser({ emailVerified: null });
    expect(await redirectTarget(() => saveAdult())).toBe("/check-email");
    expect(await db.select().from(participants)).toHaveLength(0);
  });
});
