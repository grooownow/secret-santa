import { describe, expect, it, vi } from "vitest";
import { renderServerToHtml as html } from "../../../test/render-server";
import { ParticipantCards } from "./participant-cards";
import type { Participant } from "./queries";

vi.mock("next-intl/server", () => ({
  getTranslations:
    async (ns: string) => (key: string, values?: Record<string, unknown>) =>
      values
        ? `${ns}.${key}(${Object.values(values).join(",")})`
        : `${ns}.${key}`,
}));

const ADULT = "11111111-1111-4111-8111-111111111111";
const CHILD = "22222222-2222-4222-8222-222222222222";

function person(over: Partial<Participant>): Participant {
  return {
    id: ADULT,
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

const adult = person({ photoUrl: "https://blob.example/alice.jpg" });
const child = person({ id: CHILD, kind: "child", name: "Kid", age: 6 });

const render = (people: Participant[], editable = true) =>
  html(
    <ParticipantCards
      people={people}
      building="K"
      apartment="12"
      editable={editable}
    />,
  );

/** The markup of one card, by its kind. */
function card(out: string, kind: "adult" | "child"): string {
  const start = out.indexOf(`data-kind="${kind}"`);
  return out.slice(start, out.indexOf("</li>", start));
}

describe("ParticipantCards", () => {
  it("is «you are in» alone and «your family» with a child", async () => {
    expect(await render([adult])).toContain(">profile.home.solo<");
    const family = await render([adult, child]);
    expect(family).toContain(">profile.home.family<");
    expect(family).not.toContain("profile.home.solo");
  });

  it("adult and child cards look different and carry their own chip", async () => {
    const out = await render([adult, child]);
    expect(card(out, "adult")).toContain("bg-santa-white");
    expect(card(out, "adult")).toContain("profile.home.owner");
    expect(card(out, "child")).toContain("bg-santa-mint");
    expect(card(out, "child")).toContain(
      "profile.home.child · profile.home.childAge(6)",
    );
  });

  it("shows the uploaded photo, and a placeholder without one", async () => {
    const out = await render([adult, child]);
    expect(card(out, "adult")).toContain(
      'src="https://blob.example/alice.jpg"',
    );
    expect(card(out, "adult")).toContain('alt="profile.home.photoAlt(Alice)"');
    expect(card(out, "child")).toContain('data-testid="photo-placeholder"');
  });

  it("each card has a round pencil link to its form", async () => {
    const out = await render([adult, child]);
    for (const [kind, id] of [
      ["adult", ADULT],
      ["child", CHILD],
    ] as const) {
      const one = card(out, kind);
      expect(one).toContain(`href="/home/participants/${id}"`);
      expect(one).toContain(
        `aria-label="profile.home.edit(${kind === "adult" ? "Alice" : "Kid"})"`,
      );
      expect(one).toContain("lucide-pencil");
    }
  });

  it("«add a child» is a small secondary link, and nothing is editable once closed", async () => {
    const open = await render([adult]);
    const add = open.slice(open.indexOf('href="/home/participants/new"') - 200);
    expect(add).toContain("h-10");
    expect(add).not.toContain("bg-santa-green");

    const closed = await render([adult, child], false);
    expect(closed).not.toContain("/home/participants/");
  });
});

describe("ParticipantCards after the draw (who plays now)", () => {
  const action = async () => {};
  const renderActive = (currentId: string) =>
    html(
      <ParticipantCards
        people={[adult, child]}
        building="K"
        apartment="12"
        editable={false}
        active={{ currentId, action }}
      />,
    );

  it("frames the active card, says who plays and offers «play as» for the other", async () => {
    const out = await renderActive(CHILD);
    expect(out).toContain("profile.home.activeHint(Kid)");
    const kid = card(out, "child");
    expect(kid).toContain('aria-current="true"');
    expect(kid).toContain("border-santa-green");
    expect(kid).toContain("profile.home.playingNow");
    expect(kid).not.toContain('name="participantId"');
    const alice = card(out, "adult");
    expect(alice).not.toContain("aria-current");
    expect(alice).toContain("profile.home.playAs(Alice)");
    expect(alice).toContain(`value="${ADULT}"`);
    expect(alice).toContain('name="to" value="profile"');
  });

  it("before the draw: no switching on the cards", async () => {
    const out = await render([adult, child], false);
    expect(out).not.toContain("profile.home.playingNow");
    expect(out).not.toContain('name="participantId"');
  });
});

describe("ParticipantCards: child gender", () => {
  it("shows the gender on the child chip only when it was given", async () => {
    const boy = person({
      id: CHILD,
      kind: "child",
      name: "Kid",
      age: 6,
      gender: "boy",
    });
    const withGender = card(await render([adult, boy]), "child");
    expect(withGender).toContain("profile.home.genderShort.boy");
    const without = card(await render([adult, child]), "child");
    expect(without).not.toContain("genderShort");
  });
});
