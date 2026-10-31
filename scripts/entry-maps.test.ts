import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * CLAUDE.md and AGENTS.md are the two entry maps: whichever agent runtime the
 * user is on, one of them is the first thing read. Both carry a "read the rule
 * matching your task" list, and both say at the top to keep the other in sync.
 *
 * They were not in sync. AGENTS.md silently omitted definition-of-done.md (the
 * standing bar for every change) and sources.md (the entire anti-hallucination
 * rule), so an agent entering through AGENTS.md was never told those two files
 * existed. Nothing caught it, because "keep these in sync" was a comment
 * addressed to a human who would have to notice.
 *
 * A rules file that an entry map does not name is a rules file that does not
 * exist, for the session that entered through it. This test is the mechanism
 * that comment always needed.
 */
const ROOT = process.cwd();
const ENTRY_MAPS = ["CLAUDE.md", "AGENTS.md"];

function rulesFiles(): string[] {
  return readdirSync(path.join(ROOT, "docs", "rules"))
    .filter((file) => file.endsWith(".md"))
    .sort();
}

describe("the entry maps name every rules file", () => {
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
