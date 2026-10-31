import { todayInMadrid } from "./game-time";

export type Phase = "collect" | "waiting" | "gifts" | "reveal" | "closed";

/**
 * Game settings that drive the phases. Dates are `YYYY-MM-DD` strings in the
 * Madrid time zone and are compared as strings.
 */
export interface GameSettings {
  applicationsCloseOn: string;
  drawOn: string;
  giftsStartOn: string;
  giftsEndOn: string;
  revealOn: string;
  closeOn: string;
  drawnAt: Date | null;
  purgedAt: Date | null;
}

export const DEFAULT_DATES = {
  applicationsCloseOn: "2026-12-06",
  drawOn: "2026-12-07",
  giftsStartOn: "2026-12-25",
  giftsEndOn: "2026-12-31",
  revealOn: "2027-01-01",
  closeOn: "2027-01-10",
} as const;

export function defaultSettings(
  overrides: Partial<GameSettings> = {},
): GameSettings {
  return { ...DEFAULT_DATES, drawnAt: null, purgedAt: null, ...overrides };
}

export function getPhase(now: Date, s: GameSettings): Phase {
  const today = todayInMadrid(now);
  if (today >= s.closeOn) return "closed";
  if (!s.drawnAt) return "collect";
  if (today < s.giftsStartOn) return "waiting";
  if (today < s.revealOn) return "gifts";
  return "reveal";
}

/** Registration closes after the deadline day or as soon as the draw is done. */
export function registrationOpen(now: Date, s: GameSettings): boolean {
  const today = todayInMadrid(now);
  return !s.drawnAt && today <= s.applicationsCloseOn && today < s.closeOn;
}

/** "Gift left" works from giftsStartOn through giftsEndOn inclusive. */
export function canMarkGift(now: Date, s: GameSettings): boolean {
  const today = todayInMadrid(now);
  return (
    !!s.drawnAt &&
    today >= s.giftsStartOn &&
    today <= s.giftsEndOn &&
    today < s.closeOn
  );
}

/** A guess can be changed from the draw through giftsEndOn inclusive. */
export function canGuess(now: Date, s: GameSettings): boolean {
  const today = todayInMadrid(now);
  return !!s.drawnAt && today <= s.giftsEndOn && today < s.closeOn;
}

/** Dropping out goes through the organizer and only while waiting. */
export function canExit(now: Date, s: GameSettings): boolean {
  return getPhase(now, s) === "waiting";
}

/** The wall is open from giftsStartOn through the day before closeOn. */
export function wallOpen(now: Date, s: GameSettings): boolean {
  const today = todayInMadrid(now);
  return today >= s.giftsStartOn && today < s.closeOn;
}
