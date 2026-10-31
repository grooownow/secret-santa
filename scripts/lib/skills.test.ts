import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { loadSkills, parseFrontmatter } from "./skills";

function fixtureDir(skills: Record<string, string>): string {
  const root = mkdtempSync(path.join(tmpdir(), "gridfin-skills-"));
  for (const [name, content] of Object.entries(skills)) {
    mkdirSync(path.join(root, name), { recursive: true });
    writeFileSync(path.join(root, name, "SKILL.md"), content, "utf8");
  }
  return root;
}

const VERIFY = `---
name: verify
description: Runs the gates. Use when the user asks to verify.
---

# Verify

Body text.
`;

describe("parseFrontmatter", () => {
  it("reads the name and description fields and returns the body", () => {
    const { fields, body } = parseFrontmatter(VERIFY);
    expect(fields.name).toBe("verify");
    expect(fields.description).toBe(
      "Runs the gates. Use when the user asks to verify.",
    );
    expect(body.trimStart()).toMatch(/^# Verify/);
  });

  it("returns empty fields when there is no frontmatter", () => {
    const { fields, body } = parseFrontmatter("# Just a title\n");
    expect(fields).toEqual({});
    expect(body).toBe("# Just a title\n");
  });
});

describe("loadSkills", () => {
  it("loads every skill directory, sorted by directory name", () => {
    const root = fixtureDir({ verify: VERIFY, deploy: VERIFY });
    const skills = loadSkills(root);
    expect(skills.map((s) => s.dir)).toEqual(["deploy", "verify"]);
    expect(skills[0]?.description).toContain("Runs the gates");
  });

  it("throws when a skill directory has no SKILL.md", () => {
    const root = mkdtempSync(path.join(tmpdir(), "gridfin-skills-"));
    mkdirSync(path.join(root, "broken"), { recursive: true });
    expect(() => loadSkills(root)).toThrow(/broken.*SKILL\.md/);
  });
});
