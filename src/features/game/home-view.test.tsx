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
  myGift: "waiting",
  daysToGifts: 12,
  canMark: false,
  canGuess: true,
  dates: { giftsStart: "25 December", giftsEnd: "31 December" },
};

const render = (overrides: Partial<HomeViewProps>) =>
  html(<HomeView {...base} {...overrides} />);

describe("HomeView per phase", () => {
  it("waiting: recipient, days to gifts, guess not yet open; no gift button, no wall", async () => {
    const out = await render({ canGuess: false });
    expect(out).toContain("cabinet.home.daysTitle");
    expect(out).toContain("cabinet.home.recipient");
    expect(out).toContain(`/home/recipient/${ID}`);
    expect(out).toContain('aria-disabled="true"');
    // Guessing opens with the gifts: the block says when, with no link.
    expect(out).toContain("cabinet.home.guessLater");
    expect(out).not.toContain(`/home/guess/${ID}`);
    expect(out).not.toContain("/home/wall");
    expect(out).not.toContain(`/home/gift/${ID}`);
    expect(out).not.toContain(`/home/my-gift/${ID}`);
  });

  it("gifts: status, the gift button, my gift and the wall", async () => {
    const out = await render({ phase: "gifts", canMark: true });
    expect(out).toContain("cabinet.home.notLeftTitle");
    expect(out).toContain(`/home/gift/${ID}`);
    expect(out).toContain(`/home/my-gift/${ID}`);
    expect(out).toContain("/home/wall");
    expect(out).toContain("cabinet.home.guessLinkUntil");
    expect(out).not.toContain("cabinet.home.daysTitle");
  });

  it("gifts with a saved guess: shows whom and offers to change it", async () => {
    const out = await render({
      phase: "gifts",
      canMark: true,
      guessedName: "Boris",
    });
    expect(out).toContain("cabinet.home.guessSaved");
    expect(out).toContain("cabinet.home.guessChange");
    expect(out).toContain(`/home/guess/${ID}`);
  });

  it("gifts after marking: left status and the edit button", async () => {
    const out = await render({
      phase: "gifts",
      canMark: true,
      recipient: {
        state: "ready",
        name: "Maria",
        building: "B",
        apartment: "17",
        reassigned: true,
        giftLeft: true,
      },
    });
    expect(out).toContain("cabinet.home.leftTitle");
    expect(out).toContain("cabinet.home.editGift");
    expect(out).toContain("cabinet.home.changed");
    expect(out).not.toContain("cabinet.home.notLeftTitle");
  });

  it("reveal: who is my Santa, my gift and the wall; no recipient", async () => {
    const out = await render({ phase: "reveal", canGuess: false });
    expect(out).toContain(`/home/reveal/${ID}`);
    expect(out).toContain(`/home/my-gift/${ID}`);
    expect(out).toContain("/home/wall");
    expect(out).not.toContain("cabinet.home.recipient");
    expect(out).not.toContain("/home/guess");
  });

  it("nothing to give shows the explanation instead of a recipient", async () => {
    const out = await render({ phase: "gifts", recipient: { state: "none" } });
    expect(out).toContain("cabinet.home.noneTitle");
    expect(out).not.toContain("cabinet.home.recipient");
    expect(out).not.toContain(`/home/gift/${ID}`);
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
