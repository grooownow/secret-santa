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
// The game index pulls in the database; the footer itself is the real view.
vi.mock("@/features/game", async () => {
  const { SiteFooterView } = await import("@/components/site-footer-view");
  return {
    SiteFooter: () => <SiteFooterView labels={{ title: "App author" }} />,
  };
});
vi.mock("./sign-out-action", () => ({ signOutAction: vi.fn() }));
vi.mock("@/components/organizer-link", () => ({
  OrganizerLink: () => <i>organizer-link</i>,
}));

describe("SettingsView", () => {
  it("ends with the shared author footer and has the rules link, no password change", async () => {
    const out = await html(<SettingsView email="a@b.dev" canDelete />);
    for (const href of [
      "https://ludvik4.dev/",
      "https://t.me/ludvik4",
      "https://www.threads.com/@ludvik.coffee",
    ]) {
      expect(out).toContain(
        `href="${href}" target="_blank" rel="noopener noreferrer"`,
      );
    }
    expect(out).toContain(
      '<h2 class="text-santa-ink text-base font-bold">App author</h2>',
    );
    expect(out).toContain(`href="/rules">${en.settings.rulesLink}</a>`);
    // No "order a site" line and no old «Об авторе» rows any more.
    expect(out).not.toMatch(/order a site|Get in touch|Social/i);
    expect(out).toContain("a@b.dev");
    // The header switcher already saves the language: no second picker here.
    expect(out).not.toContain("<i>language</i>");
    expect(out).not.toContain("Interface language");
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
