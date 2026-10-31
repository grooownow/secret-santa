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
import { makeUser } from "@/db/factories";
import { users } from "@/db/schema";
import { createTestDb, type TestDb } from "./helpers/test-db";

let db: TestDb;
let cleanup: () => Promise<void>;

const cookieSet = vi.fn();
const authMock = vi.fn();

vi.mock("@/db/client", () => ({ getDb: () => db }));
vi.mock("@/lib/auth", () => ({ auth: () => authMock() }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ set: cookieSet }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

beforeAll(async () => {
  ({ db, cleanup } = await createTestDb());
});
afterAll(async () => {
  await cleanup();
});
beforeEach(() => {
  cookieSet.mockReset();
  authMock.mockReset();
});

function form(locale: string): FormData {
  const data = new FormData();
  data.set("locale", locale);
  return data;
}

async function newUser() {
  const [u] = await db
    .insert(users)
    .values({ ...makeUser(), locale: "ru" })
    .returning();
  if (!u) throw new Error("user insert failed");
  return u;
}

async function storedLocale(id: string) {
  const [row] = await db.select().from(users).where(eq(users.id, id));
  return row?.locale;
}

describe("setLocaleAction", () => {
  it("sets the cookie and updates users.locale for a signed-in user", async () => {
    const { setLocaleAction } =
      await import("@/features/game/set-locale-action");
    const user = await newUser();
    authMock.mockResolvedValue({ user: { id: user.id } });

    await setLocaleAction(form("de"));

    expect(cookieSet).toHaveBeenCalledWith(
      "locale",
      "de",
      expect.objectContaining({ path: "/" }),
    );
    expect(await storedLocale(user.id)).toBe("de");
  });

  it("rejects an invalid locale and writes nothing", async () => {
    const { setLocaleAction } =
      await import("@/features/game/set-locale-action");
    const user = await newUser();
    authMock.mockResolvedValue({ user: { id: user.id } });

    await setLocaleAction(form("xx"));
    await setLocaleAction(new FormData());

    expect(cookieSet).not.toHaveBeenCalled();
    expect(authMock).not.toHaveBeenCalled();
    expect(await storedLocale(user.id)).toBe("ru");
  });

  it("sets only the cookie for a guest", async () => {
    const { setLocaleAction } =
      await import("@/features/game/set-locale-action");
    const user = await newUser();
    authMock.mockResolvedValue(null);

    await setLocaleAction(form("es"));

    expect(cookieSet).toHaveBeenCalledWith(
      "locale",
      "es",
      expect.objectContaining({ path: "/" }),
    );
    expect(await storedLocale(user.id)).toBe("ru");
  });
});
