import { beforeEach, describe, expect, it, vi } from "vitest";

const selectMock = vi.fn();
vi.mock("@/db/client", () => ({
  getDb: () => ({
    select: () => ({
      from: () => ({ where: () => ({ limit: () => selectMock() }) }),
    }),
  }),
}));
vi.mock("@/lib/password", () => ({
  verifyPassword: vi.fn(
    async (plain: string, hash: string) => hash === `H:${plain}`,
  ),
}));

import { verifyPassword } from "@/lib/password";
import { resetRateLimitStoreForTests } from "@/lib/rate-limit";
import { authorizeCredentials, DUMMY_PASSWORD_HASH } from "./auth";

beforeEach(() => {
  resetRateLimitStoreForTests();
  vi.mocked(verifyPassword).mockClear();
});

describe("authorizeCredentials", () => {
  it("returns the user for a correct email+password", async () => {
    selectMock.mockResolvedValueOnce([
      { id: "u1", email: "a@b.co", name: "A", passwordHash: "H:pw" },
    ]);
    const user = await authorizeCredentials({
      email: "a@b.co",
      password: "pw",
    });
    expect(user).toMatchObject({ id: "u1", email: "a@b.co" });
  });

  it("returns null for a wrong password", async () => {
    selectMock.mockResolvedValueOnce([
      { id: "u1", email: "a@b.co", name: "A", passwordHash: "H:pw" },
    ]);
    expect(
      await authorizeCredentials({ email: "a@b.co", password: "nope" }),
    ).toBeNull();
  });

  it("returns null when no user matches", async () => {
    selectMock.mockResolvedValueOnce([]);
    expect(
      await authorizeCredentials({ email: "x@y.co", password: "pw" }),
    ).toBeNull();
  });

  it("returns null for a user with no passwordHash (OAuth-only)", async () => {
    selectMock.mockResolvedValueOnce([
      { id: "u1", email: "a@b.co", name: "A", passwordHash: null },
    ]);
    expect(
      await authorizeCredentials({ email: "a@b.co", password: "pw" }),
    ).toBeNull();
  });

  describe("timing", () => {
    it("still verifies against the dummy hash when the user is missing", async () => {
      selectMock.mockResolvedValueOnce([]);
      await authorizeCredentials({ email: "x@y.co", password: "pw" });
      expect(verifyPassword).toHaveBeenCalledWith("pw", DUMMY_PASSWORD_HASH);
    });

    it("still verifies against the dummy hash for a Google-only user", async () => {
      selectMock.mockResolvedValueOnce([
        { id: "u1", email: "a@b.co", name: "A", passwordHash: null },
      ]);
      await authorizeCredentials({ email: "a@b.co", password: "pw" });
      expect(verifyPassword).toHaveBeenCalledWith("pw", DUMMY_PASSWORD_HASH);
    });

    it("dummy hash is a valid bcrypt hash that no real password matches", async () => {
      const { compare } = await import("bcryptjs");
      expect(await compare("pw", DUMMY_PASSWORD_HASH)).toBe(false);
    });
  });

  describe("rate limiting (direct POST to the Auth.js endpoint is covered)", () => {
    function req(ip: string) {
      return new Request("http://localhost/api/auth/callback/credentials", {
        method: "POST",
        headers: { "x-forwarded-for": ip },
      });
    }

    it("throttles per normalised email, even with a correct password", async () => {
      selectMock.mockResolvedValue([
        { id: "u1", email: "a@b.co", name: "A", passwordHash: "H:pw" },
      ]);
      const results = [];
      for (let i = 0; i < 12; i++) {
        const email = i % 2 === 0 ? "a@b.co" : "  A@B.CO ";
        // A different IP each time: only the email bucket can stop this.
        results.push(
          // oxlint-disable-next-line no-await-in-loop
          await authorizeCredentials(
            { email, password: "pw" },
            req(`1.1.1.${i}`),
          ),
        );
      }
      expect(results.slice(0, 10).every((r) => r !== null)).toBe(true);
      expect(results.slice(10)).toEqual([null, null]);
    });

    it("throttles per client IP across different emails", async () => {
      selectMock.mockResolvedValue([]);
      const results = [];
      for (let i = 0; i < 32; i++) {
        results.push(
          // oxlint-disable-next-line no-await-in-loop
          await authorizeCredentials(
            { email: `u${i}@b.co`, password: "pw" },
            req("9.9.9.9"),
          ),
        );
      }
      // The 31st and 32nd attempts are refused before any password check.
      expect(vi.mocked(verifyPassword).mock.calls.length).toBe(30);
    });

    it("does not let one IP lock out another", async () => {
      selectMock.mockResolvedValue([
        { id: "u1", email: "a@b.co", name: "A", passwordHash: "H:pw" },
      ]);
      for (let i = 0; i < 31; i++) {
        // oxlint-disable-next-line no-await-in-loop
        await authorizeCredentials(
          { email: `u${i}@b.co`, password: "pw" },
          req("9.9.9.9"),
        );
      }
      expect(
        await authorizeCredentials(
          { email: "a@b.co", password: "pw" },
          req("8.8.8.8"),
        ),
      ).not.toBeNull();
    });

    it("prefers x-real-ip over a spoofable x-forwarded-for", async () => {
      selectMock.mockResolvedValue([]);
      for (let i = 0; i < 32; i++) {
        // The attacker rotates X-Forwarded-For; the platform's x-real-ip stays.
        // oxlint-disable-next-line no-await-in-loop
        await authorizeCredentials(
          { email: `u${i}@b.co`, password: "pw" },
          new Request("http://localhost/x", {
            method: "POST",
            headers: {
              "x-real-ip": "7.7.7.7",
              "x-forwarded-for": `1.2.3.${i}`,
            },
          }),
        );
      }
      expect(vi.mocked(verifyPassword).mock.calls.length).toBe(30);
    });

    it("without any IP there is no shared bucket: other emails are not locked out", async () => {
      selectMock.mockResolvedValue([]);
      for (let i = 0; i < 40; i++) {
        // oxlint-disable-next-line no-await-in-loop
        await authorizeCredentials({ email: `u${i}@b.co`, password: "pw" });
      }
      // Every attempt reached the password check, none hit a global bucket.
      expect(vi.mocked(verifyPassword).mock.calls.length).toBe(40);
      // The per-email limit still applies.
      for (let i = 0; i < 12; i++) {
        // oxlint-disable-next-line no-await-in-loop
        await authorizeCredentials({ email: "same@b.co", password: "pw" });
      }
      expect(vi.mocked(verifyPassword).mock.calls.length).toBe(50);
    });
  });
});
