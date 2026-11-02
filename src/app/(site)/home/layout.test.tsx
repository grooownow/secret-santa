import { describe, expect, it, vi } from "vitest";
import { renderServerToHtml as html } from "../../../../test/render-server";
import CabinetLayout from "./layout";

vi.mock("next-intl/server", () => ({
  getTranslations: async (ns: string) => (key: string) => `${ns}.${key}`,
}));
vi.mock("@/features/auth", () => ({
  requireAccount: vi.fn(async () => ({})),
  isOrganizer: vi.fn(() => false),
}));
vi.mock("@/features/game", () => ({
  SiteHeader: ({ action }: { action?: React.ReactNode }) => (
    <header>{action}</header>
  ),
  ShareGame: () => <i>share-game</i>,
}));
vi.mock("@/features/profile", () => ({ CabinetNav: () => <nav /> }));

describe("cabinet layout", () => {
  it("has no sign-out button in the header (it lives in Settings)", async () => {
    const out = await html(
      <CabinetLayout>
        <p>page</p>
      </CabinetLayout>,
    );
    const header = out.slice(out.indexOf("<header"), out.indexOf("</header>"));
    expect(header).not.toContain("signOut");
    expect(header).not.toContain("<form");
  });

  it("puts «share the game» where sign-out used to be", async () => {
    const out = await html(
      <CabinetLayout>
        <p>page</p>
      </CabinetLayout>,
    );
    expect(out).toContain("<header><i>share-game</i></header>");
  });
});
