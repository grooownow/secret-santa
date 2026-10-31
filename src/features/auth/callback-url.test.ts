import { describe, expect, it } from "vitest";
import { safeCallbackUrl } from "./callback-url";

describe("safeCallbackUrl", () => {
  it("accepts a relative path", () => {
    expect(safeCallbackUrl("/home")).toBe("/home");
  });

  it("accepts a relative path with a query string", () => {
    expect(safeCallbackUrl("/home?tab=wishes")).toBe("/home?tab=wishes");
  });

  it("rejects undefined", () => {
    expect(safeCallbackUrl(undefined)).toBeUndefined();
  });

  it("rejects an empty string", () => {
    expect(safeCallbackUrl("")).toBeUndefined();
  });

  it("rejects paths not starting with /", () => {
    expect(safeCallbackUrl("home")).toBeUndefined();
  });

  it("rejects protocol-relative URLs (open redirect via //host)", () => {
    expect(safeCallbackUrl("//evil.com")).toBeUndefined();
  });

  it("rejects the /\\host browser-normalization trick", () => {
    expect(safeCallbackUrl("/\\evil.com")).toBeUndefined();
  });

  it("rejects absolute URLs to other origins", () => {
    expect(safeCallbackUrl("https://evil.com/home")).toBeUndefined();
  });

  it("rejects non-string values (e.g. a repeated query param array)", () => {
    expect(safeCallbackUrl(["/home", "/other"])).toBeUndefined();
  });
});
