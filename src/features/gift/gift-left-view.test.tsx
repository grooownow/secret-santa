import { describe, expect, it, vi } from "vitest";
import { renderServerToHtml as html } from "../../../test/render-server";
import { GiftLeftView } from "./gift-left-view";

vi.mock("next-intl/server", () => ({
  getTranslations: async (ns: string) => (key: string) => `${ns}.${key}`,
}));

describe("GiftLeftView", () => {
  it("shows the place and note read-only, with no form or edit button", async () => {
    const out = await html(
      await GiftLeftView({ participantId: "p1", place: "locker", note: "Ура" }),
    );
    expect(out).toContain("gift.form.titleDone");
    expect(out).toContain("gift.form.locker");
    expect(out).toContain("Ура");
    expect(out).not.toContain("<form");
    expect(out).not.toContain("<input");
    expect(out).not.toContain("<select");
    expect(out).not.toContain("<textarea");
    // Back is a top-left icon link, not a text link at the bottom.
    const back = out.match(/<a [^>]*>/)?.[0] ?? "";
    expect(back).toContain('href="/home/recipient/p1"');
    expect(back).toContain('aria-label="gift.form.back"');
    expect(out.indexOf("/home/recipient/p1")).toBeLessThan(
      out.indexOf("gift.form.titleDone"),
    );
    expect(out).toContain("santa.png");
  });

  it("says «no note» when there is none", async () => {
    const out = await html(
      await GiftLeftView({ participantId: "p1", place: "mailbox", note: null }),
    );
    expect(out).toContain("gift.form.noNote");
  });
});
