import type { ReactElement } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderServerToHtml as html } from "../../../test/render-server";
import { LocalizedText } from "./localized-text";
import { TranslationToggle } from "./translation-toggle";

vi.mock("next-intl/server", () => ({
  getTranslations: async (ns: string) => (key: string) => `${ns}.${key}`,
  getLocale: async () => "en",
}));

describe("LocalizedText", () => {
  it("shows the translation with a toggle to the original", async () => {
    const element = (await LocalizedText({
      original: "Привет",
      translated: "Hello",
      sourceLocale: "ru",
    })) as ReactElement<Record<string, string>>;
    expect(element.type).toBe(TranslationToggle);
    expect(element.props).toMatchObject({
      original: "Привет",
      translated: "Hello",
      showOriginalLabel: "translate.showOriginal",
    });
    render(
      <TranslationToggle
        original="Привет"
        translated="Hello"
        showOriginalLabel="Show original"
        showTranslationLabel="Show translation"
      />,
    );
    expect(screen.getByText("Hello")).toBeTruthy();
    await userEvent.click(
      screen.getByRole("button", { name: "Show original" }),
    );
    expect(screen.getByText("Привет")).toBeTruthy();
    await userEvent.click(
      screen.getByRole("button", { name: "Show translation" }),
    );
    expect(screen.getByText("Hello")).toBeTruthy();
  });

  it("without a translation shows the original and the Google Translate link", async () => {
    const out = await html(
      <LocalizedText original="Привет" translated={null} sourceLocale="ru" />,
    );
    expect(out).toContain("Привет");
    expect(out).toContain("translate.google.com");
    expect(out).toContain("translate.button");
    expect(out).not.toContain("<button");
  });

  it("the viewer's own language is shown as is, without a toggle or a link", async () => {
    const out = await html(
      <LocalizedText original="Hi" translated="ignored" sourceLocale="en" />,
    );
    expect(out).toContain("Hi");
    expect(out).not.toContain("ignored");
    expect(out).not.toContain("<button");
    expect(out).not.toContain("translate.google.com");
  });
});
