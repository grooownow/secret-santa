import { describe, expect, it } from "vitest";

import type { Skill } from "./lib/skills";
import { REQUIRED_SECTIONS, validateSkill } from "./validate-skills";

function skill(overrides: Partial<Skill> = {}): Skill {
  return {
    name: "verify",
    dir: "verify",
    description:
      "Runs the full quality-gate sequence and reports each gate PASS/FAIL. Use when the user asks to verify the project.",
    body: "# Verify\n\nSome body.\n",
    file: "/repo/.claude/skills/verify/SKILL.md",
    ...overrides,
  };
}

const KNOWN = new Set(["verify", "review", "feature"]);

describe("validateSkill", () => {
  it("accepts a well-formed skill", () => {
    expect(validateSkill(skill(), KNOWN, [])).toEqual([]);
  });

  it("rejects a name that does not match its directory", () => {
    expect(validateSkill(skill({ dir: "verifyy" }), KNOWN, [])).toEqual([
      expect.stringContaining(
        "name 'verify' does not match directory 'verifyy'",
      ),
    ]);
  });

  it("rejects a non-kebab-case name", () => {
    const errors = validateSkill(
      skill({ name: "Verify_It", dir: "Verify_It" }),
      KNOWN,
      [],
    );
    expect(errors).toContainEqual(expect.stringContaining("kebab-case"));
  });

  it("rejects a missing description", () => {
    const errors = validateSkill(skill({ description: "" }), KNOWN, []);
    expect(errors).toContainEqual(
      expect.stringContaining("description' is missing"),
    );
  });

  it("rejects a description over 1024 characters", () => {
    const errors = validateSkill(
      skill({ description: "Use when ".padEnd(1100, "x") }),
      KNOWN,
      [],
    );
    expect(errors).toContainEqual(expect.stringContaining("1024"));
  });

  it("rejects a description without a 'Use when' trigger clause", () => {
    const errors = validateSkill(
      skill({ description: "Runs the gates and reports." }),
      KNOWN,
      [],
    );
    expect(errors).toContainEqual(expect.stringContaining("trigger clause"));
  });

  it("rejects a body over 500 lines", () => {
    const body = `# Verify\n${"line\n".repeat(501)}`;
    const errors = validateSkill(skill({ body }), KNOWN, []);
    expect(errors).toContainEqual(expect.stringContaining("500 lines"));
  });

  it("rejects a reference to a skill that does not exist", () => {
    const body = "# Verify\n\nHand off to the `polish` skill when done.\n";
    const errors = validateSkill(skill({ body }), KNOWN, []);
    expect(errors).toContainEqual(
      expect.stringContaining("unknown skill 'polish'"),
    );
  });

  it("accepts a reference to a skill that does exist", () => {
    const body = "# Verify\n\nHand back to the `feature` skill when done.\n";
    expect(validateSkill(skill({ body }), KNOWN, [])).toEqual([]);
  });

  it("rejects a missing required section", () => {
    const errors = validateSkill(skill(), KNOWN, [
      "## Common rationalizations",
    ]);
    expect(errors).toContainEqual(
      expect.stringContaining(
        "missing required section '## Common rationalizations'",
      ),
    );
  });

  it("rejects Cyrillic in the description", () => {
    const errors = validateSkill(
      skill({ description: "Use when you хотите verify." }),
      KNOWN,
      [],
    );
    expect(errors).toContainEqual(expect.stringContaining("Cyrillic"));
  });

  it("rejects Cyrillic in the body", () => {
    const errors = validateSkill(
      skill({ body: "# Verify\n\nПривет, run the gates.\n" }),
      KNOWN,
      [],
    );
    expect(errors).toContainEqual(expect.stringContaining("Cyrillic"));
  });

  it("allows Cyrillic on a body line marked allow-nonascii", () => {
    const body =
      "# Gridfin\n\n> 1. English 2. Русский 3. Español <!-- allow-nonascii -->\n";
    expect(
      validateSkill(
        skill({ dir: "gridfin", name: "gridfin", body }),
        KNOWN,
        [],
      ),
    ).toEqual([]);
  });

  it("does not flag non-Cyrillic non-ASCII (em-dash, CJK, accents)", () => {
    const body =
      "# Verify\n\nRuns the gates — really — for 中文 and Français users.\n";
    expect(validateSkill(skill({ body }), KNOWN, [])).toEqual([]);
  });

  it("requires the anti-rationalization table by default", () => {
    expect(REQUIRED_SECTIONS).toContain("## Common rationalizations");
  });
});
