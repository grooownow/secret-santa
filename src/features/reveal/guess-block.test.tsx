import { describe, expect, it, vi } from "vitest";
import { renderServerToHtml as html } from "../../../test/render-server";
import { GuessBlock } from "./guess-block";

vi.mock("next-intl/server", () => ({
  getTranslations: async (ns: string) => (key: string) => `${ns}.${key}`,
}));

const dates = { giftsStart: "25 декабря", giftsEnd: "31 декабря" };

describe("GuessBlock", () => {
  it("closed before the gifts: says when, no link", async () => {
    const out = await html(
      await GuessBlock({
        personId: "p1",
        open: false,
        guessedName: null,
        dates,
      }),
    );
    expect(out).toContain("cabinet.home.guessLater");
    expect(out).not.toContain("/home/guess/p1");
  });

  it("open with a saved guess: names it and offers to change", async () => {
    const out = await html(
      await GuessBlock({
        personId: "p1",
        open: true,
        guessedName: "Боря",
        dates,
      }),
    );
    expect(out).toContain("cabinet.home.guessSaved");
    expect(out).toContain("cabinet.home.guessChange");
    expect(out).toContain("/home/guess/p1");
  });
});
