import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * CLAUDE.md is the entry map: it is the first thing an agent session reads, and
 * it carries a "read the rule matching your task" list.
 *
 * A rules file that the entry map does not name is a rules file that does not
 * exist for the session that entered through it. This test is the mechanism
 * that keeps the list complete.
 */
const ROOT = process.cwd();
const ENTRY_MAPS = ["CLAUDE.md"];

function rulesFiles(): string[] {
  return readdirSync(path.join(ROOT, "docs", "rules"))
    .filter((file) => file.endsWith(".md"))
    .sort();
}

describe("the entry map names every rules file", () => {
  it.each(ENTRY_MAPS)("%s references every docs/rules/*.md", (entryMap) => {
    const content = readFileSync(path.join(ROOT, entryMap), "utf8");
    const missing = rulesFiles().filter(
      (file) => !content.includes(`docs/rules/${file}`),
    );

    expect(
      missing,
      `${entryMap} does not name: ${missing.join(", ")}. An unnamed rule is an unread rule.`,
    ).toEqual([]);
  });

  it("names a rules file that exists (proving the check can fail)", () => {
    const content = readFileSync(path.join(ROOT, "CLAUDE.md"), "utf8");
    expect(rulesFiles()).toContain("sources.md");
    expect(content.includes("docs/rules/does-not-exist.md")).toBe(false);
  });
});
