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
import { users } from "@/db/schema";
import { createTestDb, type TestDb } from "./helpers/test-db";

// Integration test: exercises the real `updateName` server action against a
// real (in-memory PGlite) database via `getDb()`, with only the session
// (`requireUser`) and Next.js cache invalidation mocked. See
// tests/integration/helpers/test-db.ts for the db-wiring pattern.
let db: TestDb;
let cleanup: () => Promise<void>;

const requireUserMock = vi.fn();
const revalidatePathMock = vi.fn();

vi.mock("@/db/client", () => ({ getDb: () => db }));
vi.mock("@/features/auth", () => ({ requireUser: requireUserMock }));
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));

describe("updateName", () => {
  const SEED_NAME = "Original Name";
  let seededUserId: string;

  beforeAll(async () => {
    ({ db, cleanup } = await createTestDb());

    const [seeded] = await db
      .insert(users)
      .values({ email: "profile-action@gridfin.dev", name: SEED_NAME })
      .returning();
    if (!seeded) throw new Error("seed insert failed");
    seededUserId = seeded.id;
  });

  afterAll(() => cleanup());

  afterEach(() => {
    requireUserMock.mockReset();
    revalidatePathMock.mockClear();
  });

  async function currentName() {
    const [row] = await db
      .select()
      .from(users)
      .where(eq(users.id, seededUserId));
    return row?.name;
  }

  it("rejects an empty name without touching the database", async () => {
    requireUserMock.mockResolvedValue({ id: seededUserId });
    const { updateName } =
      await import("@/features/profile/update-name-action");

    const result = await updateName({ name: "" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/required/i);
    }
    expect(requireUserMock).toHaveBeenCalledOnce();
    expect(revalidatePathMock).not.toHaveBeenCalled();
    await expect(currentName()).resolves.toBe(SEED_NAME);
  });

  it("rejects a name longer than 80 characters", async () => {
    requireUserMock.mockResolvedValue({ id: seededUserId });
    const { updateName } =
      await import("@/features/profile/update-name-action");

    const result = await updateName({ name: "a".repeat(81) });

    expect(result).toEqual({ ok: false, error: "Max 80 characters" });
    expect(revalidatePathMock).not.toHaveBeenCalled();
    await expect(currentName()).resolves.toBe(SEED_NAME);
  });

  it("updates the user's name and revalidates the dashboard on valid input", async () => {
    requireUserMock.mockResolvedValue({ id: seededUserId });
    const { updateName } =
      await import("@/features/profile/update-name-action");

    const result = await updateName({ name: "  Ada Renamed  " });

    expect(result).toEqual({ ok: true });
    await expect(currentName()).resolves.toBe("Ada Renamed");
    expect(revalidatePathMock).toHaveBeenCalledExactlyOnceWith("/dashboard");
  });

  it("checks authorization before validating input", async () => {
    requireUserMock.mockResolvedValue({ id: seededUserId });
    const { updateName } =
      await import("@/features/profile/update-name-action");

    await updateName({ name: "" });

    expect(requireUserMock).toHaveBeenCalledOnce();
  });
});
