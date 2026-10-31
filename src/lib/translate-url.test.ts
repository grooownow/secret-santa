import { describe, expect, it } from "vitest";
import { translateUrl } from "./translate-url";

describe("translateUrl", () => {
  it("builds a Google Translate link with an encoded text", () => {
    expect(translateUrl("чай & кошки", "de")).toBe(
      "https://translate.google.com/?sl=auto&tl=de&text=%D1%87%D0%B0%D0%B9%20%26%20%D0%BA%D0%BE%D1%88%D0%BA%D0%B8&op=translate",
    );
  });

  it("uses the Google code for Ukrainian", () => {
    expect(translateUrl("hi", "uk")).toContain("tl=uk&");
  });

  it("cuts the text to 1500 characters", () => {
    const url = new URL(translateUrl("a".repeat(2000), "en"));
    expect(url.searchParams.get("text")).toHaveLength(1500);
  });
});
