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
