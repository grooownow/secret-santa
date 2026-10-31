import { describe, it, expect } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validateModules } from "./validate-modules";

function scratchModule(md: string): string {
  const root = mkdtempSync(join(tmpdir(), "mods-"));
  mkdirSync(join(root, "modules", "demo"), { recursive: true });
  writeFileSync(join(root, "modules", "demo", "module.md"), md);
  return root;
}

function scratchRoot(): string {
  return mkdtempSync(join(tmpdir(), "mods-"));
}

describe("validateModules", () => {
  it("accepts a well-formed module", () => {
    const root = scratchModule(
      `---\nname: demo\ndescription: d\ndepends-on: []\npresets: [App]\n---\n\n## Apply plan\n\n> 1. do it\n`,
    );
    expect(validateModules(root)).toEqual([{ name: "demo", errors: [] }]);
  });

  it("rejects a module missing the apply plan and presets", () => {
    const root = scratchModule(
      `---\nname: demo\ndescription: d\ndepends-on: []\n---\n`,
    );
    const [res] = validateModules(root);
    expect(res!.errors).toContain("missing frontmatter key: presets");
    expect(res!.errors).toContain("missing '## Apply plan' section");
  });

  it("returns [] when there is no modules/ dir", () => {
    const root = mkdtempSync(join(tmpdir(), "empty-"));
    expect(validateModules(root)).toEqual([]);
  });

  it("accepts block-style YAML arrays for depends-on and presets", () => {
    const root = scratchModule(
      `---\nname: demo\ndescription: d\ndepends-on:\n  - App\npresets:\n  - App\n  - App+Billing\n---\n\n## Apply plan\n\n> 1. do it\n`,
    );
    expect(validateModules(root)).toEqual([{ name: "demo", errors: [] }]);
  });

  it("rejects a block-style presets key with no following items as empty", () => {
    const root = scratchModule(
      `---\nname: demo\ndescription: d\ndepends-on: []\npresets:\ndescription-not-a-list: true\n---\n\n## Apply plan\n\n> 1. do it\n`,
    );
    const [res] = validateModules(root);
    expect(res!.errors).toContain("presets must be non-empty");
  });

  it("reports missing module.md when the module dir has no module.md file", () => {
    const root = scratchRoot();
    mkdirSync(join(root, "modules", "demo"), { recursive: true });
    expect(validateModules(root)).toEqual([
      { name: "demo", errors: ["missing module.md"] },
    ]);
  });

  it("returns two independent entries for two module dirs", () => {
    const root = scratchRoot();
    mkdirSync(join(root, "modules", "one"), { recursive: true });
    mkdirSync(join(root, "modules", "two"), { recursive: true });
    writeFileSync(
      join(root, "modules", "one", "module.md"),
      `---\nname: one\ndescription: d\ndepends-on: []\npresets: [App]\n---\n\n## Apply plan\n\n> 1. do it\n`,
    );
    // "two" is left invalid (missing module.md) to prove entries are independent.
    const results = validateModules(root);
    expect(results).toEqual(
      expect.arrayContaining([
        { name: "one", errors: [] },
        { name: "two", errors: ["missing module.md"] },
      ]),
    );
    expect(results).toHaveLength(2);
  });
});
