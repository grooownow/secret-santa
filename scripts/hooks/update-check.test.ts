import { describe, expect, it } from "vitest";

import {
  compareSemver,
  decideUpdateNotice,
  latestVersion,
  parseSemver,
} from "./update-check";

describe("parseSemver", () => {
  it("reads x.y.z with or without a leading v", () => {
    expect(parseSemver("1.2.3")).toEqual({ major: 1, minor: 2, patch: 3 });
    expect(parseSemver("v0.2.0")).toEqual({ major: 0, minor: 2, patch: 0 });
  });

  it("returns null for anything it does not understand", () => {
    expect(parseSemver("1.2")).toBeNull();
    expect(parseSemver("v1.2.3-rc1")).toBeNull();
    expect(parseSemver("main")).toBeNull();
    expect(parseSemver("")).toBeNull();
  });
});

describe("compareSemver orders by major, then minor, then patch", () => {
  it("ranks correctly across all three fields", () => {
    expect(
      compareSemver(parseSemver("1.0.0")!, parseSemver("0.9.9")!),
    ).toBeGreaterThan(0);
    expect(
      compareSemver(parseSemver("0.2.0")!, parseSemver("0.1.9")!),
    ).toBeGreaterThan(0);
    expect(
      compareSemver(parseSemver("0.2.1")!, parseSemver("0.2.0")!),
    ).toBeGreaterThan(0);
    expect(compareSemver(parseSemver("0.2.0")!, parseSemver("0.2.0")!)).toBe(0);
  });
});

describe("latestVersion picks the newest tag from ls-remote output", () => {
  const lines = [
    "abc123\trefs/tags/v0.1.0",
    "def456\trefs/tags/v0.2.0",
    "def456\trefs/tags/v0.2.0^{}", // dereference line — must be ignored
    "ghi789\trefs/tags/v0.10.0", // 0.10 > 0.2 numerically, not lexically
  ];

  it("finds the numerically-highest version, ignoring ^{} lines", () => {
    expect(latestVersion(lines)).toEqual({ major: 0, minor: 10, patch: 0 });
  });

  it("skips tags it cannot parse rather than choking", () => {
    expect(
      latestVersion(["x\trefs/tags/nightly", "y\trefs/tags/v1.0.0"]),
    ).toEqual({
      major: 1,
      minor: 0,
      patch: 0,
    });
  });

  it("returns null when there are no usable tags", () => {
    expect(latestVersion([])).toBeNull();
    expect(latestVersion(["z\trefs/tags/latest"])).toBeNull();
  });
});

describe("decideUpdateNotice is silent unless there is genuinely something newer", () => {
  const tags = ["a\trefs/tags/v0.3.0"];

  it("announces when the remote is strictly newer", () => {
    const { message } = decideUpdateNotice("0.2.0", tags);
    expect(message).toContain("0.3.0");
    expect(message).toContain("0.2.0");
    expect(message).toContain("/update");
  });

  it("says nothing when up to date or ahead", () => {
    expect(decideUpdateNotice("0.3.0", tags).message).toBeNull();
    expect(decideUpdateNotice("0.4.0", tags).message).toBeNull();
  });

  it("says nothing — never crashes — when either side is unreadable", () => {
    expect(decideUpdateNotice("not-a-version", tags).message).toBeNull();
    expect(decideUpdateNotice("0.2.0", []).message).toBeNull();
    expect(decideUpdateNotice("0.2.0", ["junk"]).message).toBeNull();
  });
});
