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
    expect(out).toContain("/home/recipient/p1");
  });

  it("says «no note» when there is none", async () => {
    const out = await html(
      await GiftLeftView({ participantId: "p1", place: "mailbox", note: null }),
    );
    expect(out).toContain("gift.form.noNote");
  });
});
