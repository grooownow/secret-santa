import { describe, expect, it } from "vitest";
import { flatKey } from "./apartment";

describe("flatKey", () => {
  it("treats 2b, 2 B and 2-B of one building as one flat", () => {
    expect(flatKey("B", " 2-b ")).toBe(flatKey("B", "2B"));
    expect(flatKey("B", "2 b")).toBe(flatKey("B", "2-B"));
    expect(flatKey("B", "2B")).toBe("B:2B");
  });

  it("ignores Spanish ordinal signs, punctuation and leading zeros", () => {
    for (const spelling of [
      "2ºB",
      "2º B",
      "2°b",
      "2ªB",
      "2.B",
      "2/B",
      "02B",
      "002 b",
      "2_B",
      "２B",
    ]) {
      expect(flatKey("B", spelling), spelling).toBe("B:2B");
    }
    expect(flatKey("K", "1º-03")).toBe(flatKey("K", "1 3"));
  });

  it("keeps a lone zero and inner zeros", () => {
    expect(flatKey("B", "0")).toBe("B:0");
    expect(flatKey("B", "10")).toBe("B:10");
    expect(flatKey("B", "10")).not.toBe(flatKey("B", "1"));
    expect(flatKey("B", "2B")).not.toBe(flatKey("B", "2C"));
  });

  it("keeps different buildings apart", () => {
    expect(flatKey("B", "2 B")).not.toBe(flatKey("K", "2B"));
  });

  it("keeps different flats apart", () => {
    expect(flatKey("B", "12")).not.toBe(flatKey("B", "2"));
  });
});
