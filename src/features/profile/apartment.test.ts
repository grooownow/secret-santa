import { describe, expect, it } from "vitest";
import { flatKey } from "./apartment";

describe("flatKey", () => {
  it("treats 2b, 2 B and 2-B of one building as one flat", () => {
    expect(flatKey("B", " 2-b ")).toBe(flatKey("B", "2B"));
    expect(flatKey("B", "2 b")).toBe(flatKey("B", "2-B"));
    expect(flatKey("B", "2B")).toBe("B:2B");
  });

  it("keeps different buildings apart", () => {
    expect(flatKey("B", "2 B")).not.toBe(flatKey("K", "2B"));
  });

  it("keeps different flats apart", () => {
    expect(flatKey("B", "12")).not.toBe(flatKey("B", "2"));
  });
});
