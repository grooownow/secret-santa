import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";

// The Landing core must not import the persistence stack. Fails loudly if any
// db/auth code leaks back into src/. The persistence module OVERWRITES this
// file on apply (modules/persistence/files/src/core-boundary.test.ts) with
// the inverse assertion — see module.md step 1.
describe("Landing core boundary", () => {
  it("has no import of @/db, @/lib/auth, next-auth, or drizzle in src/", () => {
    const hits = execSync(
      'grep -rnE "from \\"(@/db|@/lib/auth|next-auth|@auth/|drizzle-orm)" src || true',
      { encoding: "utf8" },
    ).trim();
    expect(hits, `leaked persistence imports:\n${hits}`).toBe("");
  });
  it("has no src/db, src/middleware.ts, or auth feature slice", () => {
    const hits = execSync(
      "ls src/db src/middleware.ts src/features/auth 2>/dev/null || true",
      { encoding: "utf8" },
    ).trim();
    expect(hits).toBe("");
  });

  // Sentry moved into the observability module (App preset). Landing core must
  // not import the Sentry SDK, and the instrumentation files must be gone. The
  // pattern anchors on the quote/paren that precedes the specifier in a static
  // (`from "..."`) or dynamic (`import("...")`) import, so this file's own text
  // — where the bare specifier appears only after `]` or a space — never
  // self-matches.
  it("has no import of the Sentry SDK in src/", () => {
    const hits = execSync('grep -rnE "[\\"(]@sentry/" src || true', {
      encoding: "utf8",
    }).trim();
    expect(hits, `leaked Sentry imports:\n${hits}`).toBe("");
  });
  it("has no src/instrumentation.ts or src/sentry.server.config.ts", () => {
    const hits = execSync(
      "ls src/instrumentation.ts src/sentry.server.config.ts 2>/dev/null || true",
      { encoding: "utf8" },
    ).trim();
    expect(hits).toBe("");
  });
});
