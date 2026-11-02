import { describe, expect, it, vi } from "vitest";
import { renderServerToHtml as html } from "../../../test/render-server";
import { RecipientCard } from "./recipient-card";

vi.mock("next-intl/server", () => ({
  getTranslations: async (ns: string) => (key: string) => `${ns}.${key}`,
  getLocale: async () => "ru",
}));
// Client component (hooks); the server-render helper calls components as
// plain functions, so stand it in with its props.
vi.mock("@/components/photo-zoom", () => ({
  PhotoZoom: ({ src, openLabel }: { src: string; openLabel: string }) => (
    <button aria-label={openLabel} data-src={src} />
  ),
}));
vi.mock("@/features/account", () => ({
  PageTitle: ({ children }: { children: React.ReactNode }) => (
    <h1>{children}</h1>
  ),
  PageText: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));
vi.mock("@/features/translation", () => ({
  LocalizedText: ({ original }: { original: string }) => <>{original}</>,
  getLocalized: async () => new Map(),
  participantKey: (id: string, f: string) => `${id}:${f}`,
}));

const recipient = {
  id: "r1",
  name: "Мария",
  kind: "adult" as const,
  age: null,
  building: "B",
  apartment: "17",
  photoUrl: null,
  wishes: "чай",
  avoid: "",
  sourceLocale: "ru" as const,
};

async function render(photoUrl: string | null) {
  return html(
    await RecipientCard({
      personId: "p1",
      recipient: { ...recipient, photoUrl },
      reassigned: false,
      giftLeft: false,
      canMark: false,
      window: { start: "25 декабря", end: "31 декабря" },
    }),
  );
}

describe("RecipientCard", () => {
  it("shows the round placeholder when there is no photo (frame Ygz4u)", async () => {
    const out = await render(null);
    expect(out).toContain('data-testid="photo-placeholder"');
    expect(out).toContain("text-santa-ink text-[17px]");
  });

  it("shows the photo instead of the placeholder when there is one", async () => {
    const out = await render("https://blob.example/p.jpg");
    expect(out).not.toContain('data-testid="photo-placeholder"');
    expect(out).toContain("blob.example");
    // The thumbnail opens the photo full screen.
    expect(out).toContain('aria-label="gift.recipient.photoOpen"');
  });
});
