import { describe, expect, it, vi } from "vitest";
import { renderServerToHtml as html } from "../../../test/render-server";
import { LanguageSwitcher } from "./language-switcher";

vi.mock("next-intl/server", () => ({
  getLocale: async () => "ru",
  getTranslations: async () => (key: string) => key,
}));
vi.mock("./set-locale-action", () => ({ setLocaleAction: vi.fn() }));
vi.mock("./language-menu", () => ({
  LanguageMenu: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

describe("LanguageSwitcher", () => {
  it("marks each language name with its own lang, so it is pronounced right", async () => {
    const out = await html(await LanguageSwitcher());
    for (const lang of ["ru", "uk", "en", "es", "de"]) {
      expect(out).toContain(`<span lang="${lang}">`);
    }
  });
});
