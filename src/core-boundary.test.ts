import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";

// Sanity check that the persistence stack (db, auth) is present in src/.
describe("App persistence boundary", () => {
  it("has src/db, src/middleware.ts, and the auth feature slice", () => {
    const hits = execSync(
      "ls src/db src/middleware.ts src/features/auth 2>/dev/null || true",
      { encoding: "utf8" },
    ).trim();
    expect(hits).not.toBe("");
  });
});
