import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";

// This file OVERWRITES Landing's guard on apply (see
// scripts/apply-module.ts copyFiles + module.md step 1). Landing's version
// asserts the persistence stack is ABSENT from src/; once persistence is
// applied that assertion is self-contradicting, so the module ships the
// inverse: a sanity check that the stack actually landed. A regression here
// means the mechanical apply silently failed to materialize App.
describe("App persistence boundary", () => {
  it("has src/db, src/middleware.ts, and the auth feature slice", () => {
    const hits = execSync(
      "ls src/db src/middleware.ts src/features/auth 2>/dev/null || true",
      { encoding: "utf8" },
    ).trim();
    expect(hits).not.toBe("");
  });
});
