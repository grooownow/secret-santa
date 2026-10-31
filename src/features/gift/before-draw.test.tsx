import { describe, expect, it, vi } from "vitest";
import { renderServerToHtml as html } from "../../../test/render-server";
import { BeforeDraw } from "./before-draw";

vi.mock("next-intl/server", () => ({
  getTranslations: async (ns: string) => (key: string, values?: object) =>
    `${ns}.${key}${values ? JSON.stringify(values) : ""}`,
  getLocale: async () => "en",
}));
vi.mock("@/features/account", () => ({
  PageTitle: ({ children }: { children: React.ReactNode }) => (
    <h1>{children}</h1>
  ),
  PageText: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));
vi.mock("@/features/game", async () => ({
  formatGameDay: (await import("@/lib/game-time")).formatGameDay,
}));

describe("BeforeDraw", () => {
  it("shows the placeholder with the draw date", async () => {
    const out = await html(<BeforeDraw drawOn="2026-12-07" />);
    expect(out).toContain("gift.beforeDraw.title");
    expect(out).toContain("December 7");
  });
});
