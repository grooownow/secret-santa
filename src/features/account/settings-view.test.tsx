import { describe, expect, it, vi } from "vitest";
import { renderServerToHtml as html } from "../../../test/render-server";
import { SettingsView } from "./settings-view";

vi.mock("next-intl/server", () => ({
  getTranslations: async (ns: string) => (key: string) => `${ns}.${key}`,
}));
vi.mock("@/features/game", () => ({ LanguageForm: () => <i>language</i> }));
vi.mock("./sign-out-action", () => ({ signOutAction: vi.fn() }));
vi.mock("@/components/organizer-link", () => ({
  OrganizerLink: () => <i>organizer-link</i>,
}));

describe("SettingsView", () => {
  it("has the author block with new-tab links and no password change", async () => {
    const out = await html(<SettingsView email="a@b.dev" canDelete />);
    for (const href of [
      "https://ludvik4.dev",
      "https://t.me/ludvik4",
      "https://www.threads.com/@ludvik.coffee",
    ]) {
      expect(out).toContain(
        `href="${href}" target="_blank" rel="noopener noreferrer"`,
      );
    }
    expect(out).toContain("settings.author.order");
    expect(out).toContain("a@b.dev");
    expect(out).toContain("language");
    expect(out).not.toMatch(/password/i);
  });

  it("offers deletion in collect and the organizer after the draw", async () => {
    const collect = await html(<SettingsView email="a@b.dev" canDelete />);
    expect(collect).toContain("settings.delete");
    expect(collect).not.toContain("organizer-link");

    const later = await html(
      <SettingsView email="a@b.dev" canDelete={false} />,
    );
    expect(later).not.toContain(">settings.delete<");
    expect(later).toContain("settings.leave");
    expect(later).toContain("organizer-link");
  });
});
