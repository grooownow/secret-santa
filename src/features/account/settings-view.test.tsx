import { describe, expect, it, vi } from "vitest";
import { renderServerToHtml as html } from "../../../test/render-server";
import en from "../../../messages/en.json";
import { SettingsView } from "./settings-view";

// Real English messages: a key that points at an object (or nowhere) throws
// here, where next-intl would quietly print the raw key on the page.
vi.mock("next-intl/server", async () => {
  const messages = (await import("../../../messages/en.json")).default;
  return {
    getTranslations: async (ns: string) => (key: string) => {
      const value = `${ns}.${key}`
        .split(".")
        .reduce<unknown>(
          (node, part) => (node as Record<string, unknown>)?.[part],
          messages,
        );
      if (typeof value !== "string") throw new Error(`no message ${ns}.${key}`);
      return value;
    },
  };
});
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
    expect(out).toContain(en.settings.author.order);
    expect(out).toContain("a@b.dev");
    expect(out).toContain("language");
    expect(out).not.toMatch(/password/i);
  });

  it("offers deletion in collect and the organizer after the draw", async () => {
    const collect = await html(<SettingsView email="a@b.dev" canDelete />);
    expect(collect).toContain(`>${en.settings.deleteLink}</a>`);
    expect(collect).not.toContain("organizer-link");

    const later = await html(
      <SettingsView email="a@b.dev" canDelete={false} />,
    );
    expect(later).not.toContain(en.settings.deleteLink);
    expect(later).toContain(`>${en.settings.leaveLink}</a>`);
    expect(later).toContain("organizer-link");
  });
});
