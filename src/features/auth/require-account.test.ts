import { afterEach, describe, expect, it, vi } from "vitest";

const requireUserMock = vi.fn();
const redirectMock = vi.fn((to: string) => {
  throw new Error(`NEXT_REDIRECT:${to}`);
});
const notFoundMock = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});
const selectMock = vi.fn();
const envMock: { ADMIN_EMAIL?: string } = {};

vi.mock("./require-user", () => ({ requireUser: requireUserMock }));
vi.mock("next/navigation", () => ({
  redirect: redirectMock,
  notFound: notFoundMock,
}));
vi.mock("@/lib/env", () => ({ env: envMock }));
vi.mock("@/db/client", () => ({
  getDb: () => ({
    select: () => ({
      from: () => ({ where: () => ({ limit: () => selectMock() }) }),
    }),
  }),
}));

const row = {
  id: "u1",
  email: "Kate@Example.com",
  name: "Kate",
  emailVerified: new Date("2026-11-01T00:00:00Z"),
  passwordHash: "secret-hash",
  locale: "ru",
  building: "A",
  apartment: "2b",
  consentVersion: "2026-10-31",
  consentAt: new Date("2026-11-01T00:00:00Z"),
  image: null,
  createdAt: new Date("2026-11-01T00:00:00Z"),
};

describe("account guards", () => {
  afterEach(() => {
    requireUserMock.mockReset();
    redirectMock.mockClear();
    notFoundMock.mockClear();
    selectMock.mockReset();
    delete envMock.ADMIN_EMAIL;
  });

  describe("requireAccount", () => {
    it("returns the user row without the password hash", async () => {
      requireUserMock.mockResolvedValue({ id: "u1", email: row.email });
      selectMock.mockResolvedValue([row]);
      const { requireAccount } = await import("./require-account");

      const account = await requireAccount();

      expect(account.id).toBe("u1");
      expect(account.locale).toBe("ru");
      expect(account).not.toHaveProperty("passwordHash");
    });

    it("sends an account without consent to /welcome", async () => {
      requireUserMock.mockResolvedValue({ id: "u1", email: row.email });
      selectMock.mockResolvedValue([{ ...row, consentAt: null }]);
      const { requireAccount } = await import("./require-account");

      await expect(requireAccount()).rejects.toThrow("NEXT_REDIRECT:/welcome");
    });

    it("lets /welcome load the account without consent (no redirect loop)", async () => {
      requireUserMock.mockResolvedValue({ id: "u1", email: row.email });
      selectMock.mockResolvedValue([{ ...row, consentAt: null }]);
      const { requireAccount } = await import("./require-account");

      await expect(
        requireAccount({ allowWithoutConsent: true }),
      ).resolves.toMatchObject({ id: "u1", consentAt: null });
      expect(redirectMock).not.toHaveBeenCalled();
    });

    it("redirects to /signin when the session user has no row", async () => {
      requireUserMock.mockResolvedValue({ id: "gone", email: null });
      selectMock.mockResolvedValue([]);
      const { requireAccount } = await import("./require-account");

      await expect(requireAccount()).rejects.toThrow("NEXT_REDIRECT:/signin");
    });
  });

  describe("requireVerifiedAccount", () => {
    it("returns a verified account", async () => {
      requireUserMock.mockResolvedValue({ id: "u1", email: row.email });
      selectMock.mockResolvedValue([row]);
      const { requireVerifiedAccount } = await import("./require-account");

      await expect(requireVerifiedAccount()).resolves.toMatchObject({
        id: "u1",
      });
    });

    it("redirects an unverified account to /check-email", async () => {
      requireUserMock.mockResolvedValue({ id: "u1", email: row.email });
      selectMock.mockResolvedValue([{ ...row, emailVerified: null }]);
      const { requireVerifiedAccount } = await import("./require-account");

      await expect(requireVerifiedAccount()).rejects.toThrow(
        "NEXT_REDIRECT:/check-email",
      );
    });
  });

  describe("requireOrganizer", () => {
    it("accepts ADMIN_EMAIL case-insensitively for a verified account", async () => {
      envMock.ADMIN_EMAIL = "kate@example.com";
      requireUserMock.mockResolvedValue({ id: "u1", email: row.email });
      selectMock.mockResolvedValue([row]);
      const { requireOrganizer } = await import("./require-account");

      await expect(requireOrganizer()).resolves.toMatchObject({ id: "u1" });
    });

    it("404s a different email", async () => {
      envMock.ADMIN_EMAIL = "someone@else.com";
      requireUserMock.mockResolvedValue({ id: "u1", email: row.email });
      selectMock.mockResolvedValue([row]);
      const { requireOrganizer } = await import("./require-account");

      await expect(requireOrganizer()).rejects.toThrow("NEXT_NOT_FOUND");
    });

    it("404s the right email when it is not verified", async () => {
      envMock.ADMIN_EMAIL = row.email;
      requireUserMock.mockResolvedValue({ id: "u1", email: row.email });
      selectMock.mockResolvedValue([{ ...row, emailVerified: null }]);
      const { requireOrganizer } = await import("./require-account");

      await expect(requireOrganizer()).rejects.toThrow("NEXT_NOT_FOUND");
    });

    it("404s everyone when ADMIN_EMAIL is not configured", async () => {
      requireUserMock.mockResolvedValue({ id: "u1", email: row.email });
      selectMock.mockResolvedValue([row]);
      const { requireOrganizer } = await import("./require-account");

      await expect(requireOrganizer()).rejects.toThrow("NEXT_NOT_FOUND");
    });
  });
});
