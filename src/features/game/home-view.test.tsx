import { describe, expect, it, vi } from "vitest";
import { renderServerToHtml as html } from "../../../test/render-server";
import { HomeView, type HomeViewProps } from "./home-view";
import { ParticipantSwitcher } from "./participant-switcher";

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

const ID = "11111111-1111-4111-8111-111111111111";

const base: HomeViewProps = {
  phase: "waiting",
  person: { id: ID, name: "Anna" },
  recipient: {
    state: "ready",
    name: "Maria",
    building: "B",
    apartment: "17",
    reassigned: false,
    giftLeft: false,
  },
  forYou: <section data-testid="for-you">for-you</section>,
  daysToGifts: 12,
  dates: { giftsStart: "25 December", giftsEnd: "31 December" },
};

const render = (overrides: Partial<HomeViewProps>) =>
  html(<HomeView {...base} {...overrides} />);

describe("HomeView per phase", () => {
  it("waiting: days to gifts and «your recipient» with one link to their page", async () => {
    const out = await render({});
    expect(out).toContain("cabinet.home.daysTitle");
    expect(out).toContain("cabinet.home.recipient");
    expect(out).toContain("cabinet.home.openRecipient");
    expect(out).toContain(`/home/recipient/${ID}`);
    // What I receive is not news yet; no big buttons, no guessing, no wall.
    expect(out).not.toContain('data-testid="for-you"');
    expect(out).not.toContain(`/home/gift/${ID}`);
    expect(out).not.toContain("/home/guess");
    expect(out).not.toContain("/home/wall");
  });

  it("gifts: «a gift for you» comes first, then the recipient, then the wall", async () => {
    const out = await render({ phase: "gifts" });
    const forYou = out.indexOf('data-testid="for-you"');
    const giving = out.indexOf("cabinet.home.recipient");
    expect(forYou).toBeGreaterThan(-1);
    expect(forYou).toBeLessThan(giving);
    expect(out).toContain('data-giving="todo"');
    expect(out).toContain(`/home/recipient/${ID}`);
    expect(out).toContain("/home/wall");
    // Leaving the gift lives on the recipient's page, not as a home button.
    expect(out).not.toContain(`/home/gift/${ID}`);
    expect(out).not.toContain("cabinet.home.daysTitle");
    // My gift and guessing moved to «Профиль».
    expect(out).not.toContain(`/home/my-gift/${ID}`);
    expect(out).not.toContain("/home/guess");
  });

  it("gifts after my gift is left: «we told the recipient» and a small «view» link", async () => {
    const out = await render({
      phase: "gifts",
      recipient: {
        state: "ready",
        name: "Maria",
        building: "B",
        apartment: "17",
        reassigned: true,
        giftLeft: true,
      },
    });
    expect(out).toContain('data-giving="left"');
    expect(out).toContain("cabinet.home.givenText");
    expect(out).toContain("cabinet.home.givenLink");
    expect(out).toContain("cabinet.home.changed");
    expect(out).not.toContain("cabinet.home.openRecipient");
  });

  it("reveal: who is my Santa and the wall; no recipient", async () => {
    const out = await render({ phase: "reveal" });
    expect(out).toContain(`/home/reveal/${ID}`);
    expect(out).toContain("/home/wall");
    expect(out).not.toContain("cabinet.home.recipient");
    expect(out).not.toContain('data-testid="for-you"');
  });

  it("nobody left to give to: the none box", async () => {
    const out = await render({ recipient: { state: "none" } });
    expect(out).toContain("cabinet.home.noneTitle");
    expect(out).not.toContain("cabinet.home.recipient");
  });
});

describe("ParticipantSwitcher", () => {
  const other = "22222222-2222-4222-8222-222222222222";
  const people = [
    { id: ID, name: "Anna", kind: "adult" as const, age: null },
    { id: other, name: "Misha", kind: "child" as const, age: 8 },
  ];
  const action = async () => {};

  it("highlights the active participant and offers a button for the other", async () => {
    const out = await html(
      <ParticipantSwitcher
        people={people}
        currentId={ID}
        building="K"
        apartment="24"
        action={action}
        to="gift"
      />,
    );
    expect(out).toContain("Anna");
    expect(out).toContain("Misha");
    // Exactly one card is marked active, and it is Anna's.
    expect(out.match(/aria-current="true"/g)).toHaveLength(1);
    expect(out.indexOf('aria-current="true"')).toBeLessThan(
      out.indexOf("Misha"),
    );
    expect(out).toContain("cabinet.switcher.current");
    // The choice is a POST (no link a prefetch could follow), only for Misha.
    expect(out).not.toContain("/home/switch/");
    expect(out.match(/name="participantId"/g)).toHaveLength(1);
    expect(out).toContain(`value="${other}"`);
    expect(out).toContain('name="to" value="gift"');
  });
});
