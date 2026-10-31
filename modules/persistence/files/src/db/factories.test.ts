import { describe, expect, it } from "vitest";
import { makeUser } from "./factories";

describe("makeUser", () => {
  it("generates unique emails", () => {
    expect(makeUser().email).not.toBe(makeUser().email);
  });

  it("applies overrides", () => {
    expect(makeUser({ email: "fixed@gridfin.dev" }).email).toBe(
      "fixed@gridfin.dev",
    );
  });
});
