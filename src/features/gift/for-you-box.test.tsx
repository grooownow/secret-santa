import { describe, expect, it, vi } from "vitest";
import { renderServerToHtml as html } from "../../../test/render-server";
import { ForYouBox } from "./for-you-box";

vi.mock("next-intl/server", () => ({
  getTranslations:
    async (ns: string) => (key: string, values?: Record<string, unknown>) =>
      values
        ? `${ns}.${key}(${Object.values(values).join(",")})`
        : `${ns}.${key}`,
}));

const render = (over: Partial<Parameters<typeof ForYouBox>[0]>) =>
  ForYouBox({
    personId: "p1",
    name: "Вася",
    started: true,
    startDate: "25 декабря",
    gift: { status: "waiting", place: null, note: null },
    ...over,
  }).then(html);

describe("ForYouBox («Подарок для тебя»)", () => {
  it("before the gifts start: only when they start, no status", async () => {
    const out = await render({ started: false });
    expect(out).toContain('data-for-you="soon"');
    expect(out).toContain("gift.forYou.soon(25 декабря)");
    expect(out).not.toContain("waitingTitle");
  });

  it("left: a green box «Вася, тебя ждёт подарок!» with place, note and details", async () => {
    const out = await render({
      gift: { status: "left", place: "locker", note: "С праздником" },
    });
    expect(out).toContain('data-for-you="left"');
    expect(out).toContain("bg-santa-lime");
    expect(out).toContain("gift.forYou.leftTitle(Вася)");
    expect(out).toContain("gift.forYou.leftPlace.locker");
    expect(out).toContain("gift.forYou.note(С праздником)");
    expect(out).toContain("/home/my-gift/p1");
  });

  it("not left yet: a plain line, no green highlight", async () => {
    const out = await render({});
    expect(out).toContain('data-for-you="waiting"');
    expect(out).toContain("gift.forYou.waitingTitle");
    expect(out).not.toContain("bg-santa-lime");
  });
});
