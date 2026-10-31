import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * `.gridfin-version` is what a buyer's update check compares against. If it names
 * a version the CHANGELOG never documented, the buyer is told to update to a
 * version with no release notes and no apply plan — worse than not telling them
 * at all. This test makes shipping that state impossible: the released version
 * must have a changelog section, and that section must carry the apply plan the
 * update flow depends on.
 *
 * Deliberately NOT package.json's `version`. That field belongs to the product,
 * and in a buyer's tree it is *their* product's version — which is exactly why
 * this file is excluded from the export (see scripts/export-template.sh): run in
 * their repo, it would demand a changelog entry for a release that is not ours to
 * write. This is a maintainer's check, and it stays home.
 *
 * It is not the `scripts/release` preflight (that is bash, and runs at release
 * time). It is the standing invariant, checked on every push, so the two can
 * never drift: you cannot stamp a version and forget the changelog.
 */
const ROOT = process.cwd();

function currentVersion(): string {
  return readFileSync(path.join(ROOT, ".gridfin-version"), "utf8").trim();
}

/** The changelog body under `## [version]`, up to the next `## ` heading. */
function changelogSection(version: string): string | null {
  const changelog = readFileSync(path.join(ROOT, "CHANGELOG.md"), "utf8");
  const escaped = version.replace(/\./g, "\\.");
  const match = new RegExp(
    `^## \\[${escaped}\\][^\\n]*\\n([\\s\\S]*?)(?=^## )`,
    "m",
  ).exec(changelog);
  return match?.[1] ?? null;
}

describe("the released version is documented", () => {
  it("the stamped template version has a CHANGELOG section", () => {
    const version = currentVersion();
    expect(
      changelogSection(version),
      `.gridfin-version is ${version} but CHANGELOG.md has no "## [${version}]" section`,
    ).not.toBeNull();
  });

  it("that section carries an apply plan for buyers to update with", () => {
    const version = currentVersion();
    const section = changelogSection(version) ?? "";
    expect(
      section,
      `the [${version}] changelog section has no "### Apply plan" — buyers need one to update`,
    ).toContain("### Apply plan");
  });

  it("detects a version that was never written up (proving the check can fail)", () => {
    expect(changelogSection("99.99.99")).toBeNull();
  });
});

/**
 * The bug this guards against is subtle and would only surface in a buyer's repo,
 * months later: the template's version and the product's version living in the
 * same field. The day a buyer ships 1.0.0 of their own product, a check reading
 * package.json would decide they are ahead of the template and go silent for
 * good — the update system would fail exactly the way you cannot notice.
 */
describe("the template version is tracked separately from the product version", () => {
  it("the stamp is a bare semver, not the product's package.json version", () => {
    const stamped = currentVersion();
    expect(stamped).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("nothing in the update path reads package.json for the template version", () => {
    const hook = readFileSync(
      path.join(ROOT, "scripts", "hooks", "session-update-check.ts"),
      "utf8",
    );
    // package.json may only appear as the documented legacy fallback for
    // projects updated from 0.2.0 — never as the primary source.
    const stampIndex = hook.indexOf(".gridfin-version");
    const pkgIndex = hook.indexOf(
      "package.json",
      hook.indexOf("function installedVersion"),
    );
    expect(stampIndex).toBeGreaterThan(-1);
    expect(
      stampIndex,
      "the hook must read .gridfin-version BEFORE falling back to package.json",
    ).toBeLessThan(pkgIndex);
  });
});
