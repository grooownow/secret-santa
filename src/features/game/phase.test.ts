import { describe, expect, it, test } from "vitest";
import { mailWindow } from "@/lib/game-phase";
import {
  canExit,
  canGuess,
  canMarkGift,
  defaultSettings,
  getPhase,
  registrationOpen,
  wallOpen,
} from "./phase";

const at = (day: string) => new Date(`${day}T12:00:00Z`);
const defaults = defaultSettings;
const drawn = () => defaults({ drawnAt: new Date("2026-12-07T10:00:00Z") });

describe("getPhase", () => {
  test("phases", () => {
    const s = drawn();
    expect(getPhase(at("2026-12-20"), s)).toBe("waiting");
    expect(getPhase(at("2026-12-25"), s)).toBe("gifts");
    expect(getPhase(at("2027-01-01"), s)).toBe("reveal");
    expect(getPhase(at("2027-01-10"), s)).toBe("closed");
  });

  test("no draw yet stays in collect until closed", () => {
    expect(getPhase(at("2026-12-26"), defaults())).toBe("collect");
    expect(getPhase(at("2027-01-10"), defaults())).toBe("closed");
  });

  test("the last day before each boundary", () => {
    const s = drawn();
    expect(getPhase(at("2026-12-24"), s)).toBe("waiting");
    expect(getPhase(at("2026-12-31"), s)).toBe("gifts");
    expect(getPhase(at("2027-01-09"), s)).toBe("reveal");
  });

  test("uses the Madrid day, not the UTC day", () => {
    const s = drawn();
    expect(getPhase(new Date("2026-12-24T23:30:00Z"), s)).toBe("gifts");
  });
});

describe("registrationOpen", () => {
  test("closes after the deadline or the draw", () => {
    expect(registrationOpen(at("2026-12-06"), defaults())).toBe(true);
    expect(registrationOpen(at("2026-12-07"), defaults())).toBe(false);
  });

  test("closed once the draw is done even before the deadline", () => {
    expect(registrationOpen(at("2026-12-05"), drawn())).toBe(false);
  });
});

describe("canMarkGift and canGuess", () => {
  test("gift can be marked only from giftsStartOn to giftsEndOn inclusive", () => {
    const s = drawn();
    expect(canMarkGift(at("2026-12-24"), s)).toBe(false);
    expect(canMarkGift(at("2026-12-25"), s)).toBe(true);
    expect(canMarkGift(at("2026-12-31"), s)).toBe(true);
    expect(canMarkGift(at("2027-01-01"), s)).toBe(false);
  });

  test("nothing can be marked without a draw", () => {
    expect(canMarkGift(at("2026-12-26"), defaults())).toBe(false);
    expect(canGuess(at("2026-12-26"), defaults())).toBe(false);
  });

  test("guess opens with the gifts: giftsStartOn through giftsEndOn inclusive", () => {
    const s = drawn();
    expect(canGuess(at("2026-12-10"), s)).toBe(false);
    expect(canGuess(at("2026-12-24"), s)).toBe(false);
    expect(canGuess(at("2026-12-25"), s)).toBe(true);
    expect(canGuess(at("2026-12-31"), s)).toBe(true);
    expect(canGuess(at("2027-01-01"), s)).toBe(false);
  });
});

describe("canExit", () => {
  test("only in the waiting phase", () => {
    const s = drawn();
    expect(canExit(at("2026-12-10"), s)).toBe(true);
    expect(canExit(at("2026-12-24"), s)).toBe(true);
    expect(canExit(at("2026-12-25"), s)).toBe(false);
    expect(canExit(at("2026-12-05"), defaults())).toBe(false);
  });
});

describe("wallOpen", () => {
  test("from giftsStartOn through the day before closeOn", () => {
    const s = drawn();
    expect(wallOpen(at("2026-12-24"), s)).toBe(false);
    expect(wallOpen(at("2026-12-25"), s)).toBe(true);
    expect(wallOpen(at("2027-01-09"), s)).toBe(true);
    expect(wallOpen(at("2027-01-10"), s)).toBe(false);
  });
});

describe("mailWindow (shared by the daily job and «Дослать»)", () => {
  const s = defaultSettings({ drawnAt: new Date("2026-12-07T10:00:00Z") });
  it.each([
    ["reminder", "2026-12-26", "before"],
    ["reminder", "2026-12-29", "open"],
    ["reminder", "2026-12-31", "open"],
    ["reminder", "2027-01-01", "after"],
    ["gifts-open", "2026-12-24", "before"],
    ["gifts-open", "2026-12-25", "open"],
    ["gifts-open", "2027-01-01", "after"],
    ["reveal", "2026-12-31", "before"],
    ["reveal", "2027-01-09", "open"],
    ["reveal", "2027-01-10", "after"],
    ["draw", "2026-12-07", "open"],
  ] as const)("%s on %s is %s", (event, today, expected) => {
    expect(mailWindow(event, s, today)).toBe(expected);
  });
  it("nothing is due before the draw", () => {
    expect(mailWindow("draw", defaultSettings(), "2026-12-07")).toBe("before");
  });
  it("the reminder never starts before the gifts window", () => {
    const short = { ...s, giftsStartOn: "2026-12-30" };
    expect(mailWindow("reminder", short, "2026-12-29")).toBe("before");
    expect(mailWindow("reminder", short, "2026-12-30")).toBe("open");
  });
});
