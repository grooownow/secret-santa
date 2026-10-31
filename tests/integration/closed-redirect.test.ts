import { existsSync } from "node:fs";
import path from "node:path";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { settings } from "@/db/schema";
import { DEFAULT_DATES } from "@/features/game/phase";
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
beforeEach(async () => {
  await db.delete(settings);
  vi.useRealTimers();
});

async function expectRedirectToClosed(run: () => Promise<unknown>) {
  const error: unknown = await run().then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(error).toMatchObject({
    digest: expect.stringMatching(/^NEXT_REDIRECT;.*;\/closed;/),
  });
}

describe("closed phase redirect", () => {
  it("redirects the (site) layout to /closed from the closing date", async () => {
    const { default: SiteLayout } = await import("@/app/(site)/layout");
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(`${DEFAULT_DATES.closeOn}T12:00:00+01:00`));

    await expectRedirectToClosed(() => SiteLayout({ children: null }));
  });

  it("renders children while the game is still open", async () => {
    const { default: SiteLayout } = await import("@/app/(site)/layout");
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-12-01T12:00:00+01:00"));

    await expect(SiteLayout({ children: "page" })).resolves.toBe("page");
  });

  it("uses the organizer's closing date, not the default", async () => {
    const { redirectIfClosed } = await import("@/features/game/ensure-open");
    const { getSettings } = await import("@/features/game/settings");
    await getSettings();
    await db.update(settings).set({ closeOn: "2026-12-20" });

    await expectRedirectToClosed(() =>
      redirectIfClosed(new Date("2026-12-20T09:00:00+01:00")),
    );
    await expect(
      redirectIfClosed(new Date("2026-12-19T23:00:00+01:00")),
    ).resolves.toBeUndefined();
  });

  it("keeps /closed outside the redirecting route group", () => {
    const app = path.resolve(__dirname, "../../src/app");
    expect(existsSync(path.join(app, "closed/page.tsx"))).toBe(true);
    expect(existsSync(path.join(app, "(site)/closed"))).toBe(false);
    expect(existsSync(path.join(app, "(site)/layout.tsx"))).toBe(true);
  });
});
