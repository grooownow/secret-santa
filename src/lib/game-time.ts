/** The game runs on neighbours' wall-clock days in Madrid, not UTC. */
export const GAME_TIME_ZONE = "Europe/Madrid";

const dayFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: GAME_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Calendar day in Madrid as `YYYY-MM-DD` (strings compare chronologically). */
export function todayInMadrid(now: Date): string {
  return dayFormat.format(now);
}

/** `YYYY-MM-DD` as "25 декабря" in the given interface language. */
export function formatGameDay(date: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

/** Whole days from `from` to `to` (both `YYYY-MM-DD`), never negative. */
export function daysBetween(from: string, to: string): number {
  const ms = Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`);
  return Math.max(0, Math.round(ms / 86_400_000));
}
