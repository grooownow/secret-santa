import { describe, expect, it } from "vitest";
import { splitPriceHeading } from "./build";

describe("splitPriceHeading", () => {
  it("puts the English beta promise on exactly two explicit lines", () => {
    expect(splitPriceHeading("en", "Beta: you test — I fix")).toBe(
      "<span>Beta: you test —</span><span>I fix</span>",
    );
  });

  it("leaves translated headings unchanged", () => {
    expect(splitPriceHeading("de", "Beta: Du testest — ich verbessere")).toBe(
      "Beta: Du testest — ich verbessere",
    );
  });
});
