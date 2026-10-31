import { afterEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const redirectMock = vi.fn(() => {
  throw new Error("NEXT_REDIRECT_SENTINEL");
});
const selectMock = vi.fn();
// Mutable, not a factory: require-user.ts reads env.AUTH_DEV_BYPASS at call
// time (not import time), so flipping this field between tests changes
// behavior without needing vi.doMock/vi.resetModules per case. Default is
// bypass OFF so the pre-existing redirect cases stay deterministic — the
// real @/lib/env defaults AUTH_DEV_BYPASS to true, so leaving this module
// unmocked would make those cases return the seeded admin instead of
// redirecting.
const envMock: { AUTH_DEV_BYPASS: boolean; SEED_ADMIN_EMAIL: string } = {
  AUTH_DEV_BYPASS: false,
  SEED_ADMIN_EMAIL: "admin@example.local",
};

vi.mock("@/lib/auth", () => ({ auth: authMock }));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("@/lib/env", () => ({ env: envMock }));
vi.mock("@/db/client", () => ({
  getDb: () => ({
    select: () => ({
      from: () => ({ where: () => ({ limit: () => selectMock() }) }),
    }),
  }),
}));

describe("requireUser", () => {
  afterEach(() => {
    authMock.mockReset();
    redirectMock.mockClear();
    selectMock.mockReset();
    envMock.AUTH_DEV_BYPASS = false;
  });

  it("redirects to /signin when there is no session", async () => {
    authMock.mockResolvedValue(null);
    const { requireUser } = await import("./require-user");

    await expect(requireUser()).rejects.toThrow("NEXT_REDIRECT_SENTINEL");

    expect(redirectMock).toHaveBeenCalledExactlyOnceWith("/signin");
  });

  it("redirects to /signin when the session has no user", async () => {
    authMock.mockResolvedValue({ user: undefined });
    const { requireUser } = await import("./require-user");

    await expect(requireUser()).rejects.toThrow("NEXT_REDIRECT_SENTINEL");

    expect(redirectMock).toHaveBeenCalledExactlyOnceWith("/signin");
  });

  it("returns the session user's id/email/name without redirecting", async () => {
    authMock.mockResolvedValue({
      user: { id: "user-1", email: "a@gridfin.dev", name: "Ada" },
      sessionVersion: 4,
    });
    const { requireUser } = await import("./require-user");

    await expect(requireUser()).resolves.toEqual({
      id: "user-1",
      email: "a@gridfin.dev",
      name: "Ada",
      sessionVersion: 4,
    });
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("defaults email to null when the session user has none", async () => {
    authMock.mockResolvedValue({ user: { id: "user-2" } });
    const { requireUser } = await import("./require-user");

    await expect(requireUser()).resolves.toEqual({
      id: "user-2",
      email: null,
      name: undefined,
      // An old token without a version is reported as -1, which never matches.
      sessionVersion: -1,
    });
  });

  it("returns the seeded admin when dev bypass is on and there is no session", async () => {
    authMock.mockResolvedValue(null);
    envMock.AUTH_DEV_BYPASS = true;
    selectMock.mockResolvedValue([
      { id: "seed-1", email: "admin@example.local", name: "Admin" },
    ]);
    const { requireUser } = await import("./require-user");

    await expect(requireUser()).resolves.toMatchObject({
      id: "seed-1",
      email: "admin@example.local",
    });
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("falls through to redirect when dev bypass is on but no admin row exists", async () => {
    authMock.mockResolvedValue(null);
    envMock.AUTH_DEV_BYPASS = true;
    selectMock.mockResolvedValue([]);
    const { requireUser } = await import("./require-user");

    await expect(requireUser()).rejects.toThrow("NEXT_REDIRECT_SENTINEL");
    expect(redirectMock).toHaveBeenCalledExactlyOnceWith("/signin");
  });
});
