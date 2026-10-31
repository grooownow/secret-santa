import { describe, it, expect, afterEach } from "vitest";
import { mkdtempSync, rmSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { materializeApp } from "./materialize-app";

/**
 * Proves the round-trip Task 5 verified out-of-tree: applying `persistence`
 * and `observability` to a fresh copy of the repo's tracked files reproduces
 * App. This test only
 * asserts file materialization — the heavier install+tsc+test proof lives in
 * the `materialized-app` CI job (see .github/workflows/ci.yml), not here.
 */
describe("materializeApp", () => {
  let dir: string;

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it("copies the repo tree and applies the persistence + observability modules on top", () => {
    dir = mkdtempSync(join(tmpdir(), "materialize-app-"));

    materializeApp(dir);

    // Persistence module-owned files landed.
    expect(existsSync(join(dir, "src/db/schema.ts"))).toBe(true);
    expect(existsSync(join(dir, "src/middleware.ts"))).toBe(true);
    expect(existsSync(join(dir, "src/lib/auth.ts"))).toBe(true);

    // Observability module-owned files landed.
    expect(existsSync(join(dir, "src/sentry.server.config.ts"))).toBe(true);
    expect(existsSync(join(dir, "src/instrumentation.ts"))).toBe(true);

    // env.ts was OVERWRITTEN to the App version (file-overwrite, not splice —
    // Task 5's inversion), proven by an App-only env var.
    const env = readFileSync(join(dir, "src/lib/env.ts"), "utf8");
    expect(env).toContain("AUTH_DEV_BYPASS");

    // page.tsx was OVERWRITTEN to the App version, which links to /signin.
    const page = readFileSync(join(dir, "src/app/page.tsx"), "utf8");
    expect(page).toContain("/signin");
  });
});
