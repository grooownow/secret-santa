import { formatGameDay } from "@/lib/game-time";
import type { GameSettings } from "@/features/game";

/** The dates of the game as ready-made strings for message placeholders. */
export type GameDates = {
  close: string;
  draw: string;
  giftsStart: string;
  giftsEnd: string;
  reveal: string;
  closeDay: string;
  closeLong: string;
  lastExit: string;
  /** "25–31 December", for languages where a range reads naturally. */
  range: string;
  /** Start and end of the gift window: "25" and "31 December" in one month. */
  from: string;
  to: string;
};

function fmt(locale: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(locale, { ...options, timeZone: "UTC" });
}

/** The day before a `YYYY-MM-DD` date, as `YYYY-MM-DD`. */
function dayBefore(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

const noon = (date: string) => new Date(`${date}T12:00:00Z`);

/** Formats the settings dates in the interface language (never hard-coded). */
export function gameDates(s: GameSettings, locale: string): GameDates {
  const dayMonth = fmt(locale, { day: "numeric", month: "long" });
  const start = noon(s.giftsStartOn);
  const end = noon(s.giftsEndOn);
  const sameMonth = s.giftsStartOn.slice(0, 7) === s.giftsEndOn.slice(0, 7);
  const dayOnly = fmt(locale, { day: "numeric" });
  return {
    close: formatGameDay(s.applicationsCloseOn, locale),
    draw: formatGameDay(s.drawOn, locale),
    giftsStart: formatGameDay(s.giftsStartOn, locale),
    giftsEnd: formatGameDay(s.giftsEndOn, locale),
    reveal: formatGameDay(s.revealOn, locale),
    closeDay: formatGameDay(s.closeOn, locale),
    closeLong: fmt(locale, { dateStyle: "long" }).format(noon(s.closeOn)),
    lastExit: formatGameDay(dayBefore(s.giftsStartOn), locale),
    range: dayMonth.formatRange(start, end),
    from: sameMonth ? dayOnly.format(start) : dayMonth.format(start),
    to: formatGameDay(s.giftsEndOn, locale),
  };
}
