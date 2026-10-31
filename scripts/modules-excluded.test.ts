import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

describe("modules/ is outside the core surface", () => {
  it("tsconfig excludes modules", () => {
    const tsconfig = JSON.parse(readFileSync("tsconfig.json", "utf8"));
    expect(tsconfig.exclude).toContain("modules");
  });
  it("prettier ignores module files", () => {
    expect(readFileSync(".prettierignore", "utf8")).toMatch(/^modules\//m);
  });
  it("oxlint ignores module files", () => {
    // pnpm lint runs `oxlint .` first, and oxlint reads its own ignore list
    // from .oxlintrc.json — not eslint's. Both must exclude modules/ or the
    // materialized module files (e.g. scripts/seed.ts console output) fail the
    // core lint.
    const oxlint = JSON.parse(readFileSync(".oxlintrc.json", "utf8"));
    expect(oxlint.ignorePatterns).toContain("modules/**");
  });
  it("eslint ignores module files", () => {
    expect(readFileSync("eslint.config.mjs", "utf8")).toMatch(/modules\/\*\*/);
  });
});
