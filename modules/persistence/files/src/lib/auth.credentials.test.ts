import { describe, expect, it, vi } from "vitest";

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

import { authorizeCredentials } from "./auth";

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
});
