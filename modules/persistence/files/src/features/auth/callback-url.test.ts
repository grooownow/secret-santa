import { describe, expect, it } from "vitest";
import { safeCallbackUrl } from "./callback-url";

describe("safeCallbackUrl", () => {
  it("accepts a relative path", () => {
    expect(safeCallbackUrl("/dashboard")).toBe("/dashboard");
  });

  it("accepts a relative path with a query string", () => {
    expect(safeCallbackUrl("/dashboard?tab=billing")).toBe(
      "/dashboard?tab=billing",
    );
  });

  it("rejects undefined", () => {
    expect(safeCallbackUrl(undefined)).toBeUndefined();
  });

  it("rejects an empty string", () => {
    expect(safeCallbackUrl("")).toBeUndefined();
  });

  it("rejects paths not starting with /", () => {
    expect(safeCallbackUrl("dashboard")).toBeUndefined();
  });

  it("rejects protocol-relative URLs (open redirect via //host)", () => {
    expect(safeCallbackUrl("//evil.com")).toBeUndefined();
  });

  it("rejects the /\\host browser-normalization trick", () => {
    expect(safeCallbackUrl("/\\evil.com")).toBeUndefined();
  });

  it("rejects absolute URLs to other origins", () => {
    expect(safeCallbackUrl("https://evil.com/dashboard")).toBeUndefined();
  });

  it("rejects non-string values (e.g. a repeated query param array)", () => {
    expect(safeCallbackUrl(["/dashboard", "/other"])).toBeUndefined();
  });
});
