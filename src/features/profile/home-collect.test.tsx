import { describe, expect, it, vi } from "vitest";
import { renderServerToHtml as html } from "../../../test/render-server";
import type { GameSettings } from "@/features/game";
import { HomeCollect } from "./home-collect";
import type { Participant } from "./queries";

vi.mock("next-intl/server", () => ({
  getTranslations: async (ns: string) => (key: string) => `${ns}.${key}`,
  getLocale: async () => "en",
}));
// The account index pulls in Auth.js, which the component project cannot load.
vi.mock("@/features/account", () => ({
  PageTitle: ({ children }: { children: React.ReactNode }) => (
    <h1>{children}</h1>
  ),
  PageText: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

const settings = {
  applicationsCloseOn: "2026-12-05",
  drawOn: "2026-12-07",
} as GameSettings;

function person(over: Partial<Participant>): Participant {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    userId: "u1",
    kind: "adult",
    name: "Alice",
    age: null,
    wishes: "",
    avoid: "",
    photoUrl: null,
    ...over,
  } as Participant;
}

const render = (people: Participant[]) =>
  html(
    <HomeCollect
      people={people}
      settings={settings}
      building="K"
      apartment="12"
      registrationOpen
    />,
  );

describe("HomeCollect", () => {
  it("has no «what would delight your Santa» hint block", async () => {
    for (const people of [[], [person({})]]) {
      // oxlint-disable-next-line no-await-in-loop
      const out = await render(people);
      expect(out).not.toContain("profile.home.hintTitle");
      expect(out).not.toContain("profile.home.hintText");
    }
  });
});
