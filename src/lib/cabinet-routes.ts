import type { Route } from "next";

/**
 * Cabinet routes shared by several features. They live in `lib` so the game,
 * profile and gift features can link to each other without importing each
 * other. Pages that arrive in later tasks (wall, settings, guess, reveal) are
 * not known to typedRoutes yet; drop the casts once they exist.
 */
export const CABINET_HOME = "/home" as Route;
export const CABINET_GIFT = "/home/gift" as Route;
export const CABINET_WALL = "/home/wall" as Route;
export const CABINET_SETTINGS = "/home/settings" as Route;
export const NEW_PARTICIPANT = "/home/participants/new" as Route;

export function participantPath(id: string): Route {
  return `/home/participants/${id}` as Route;
}
/** The participant's own cabinet (switcher choice). */
export function homeOf(id: string): Route {
  return `/home?p=${id}` as Route;
}
/** Recipient card of the participant's gift. */
export function recipientPath(id: string): Route {
  return `/home/recipient/${id}` as Route;
}
/** "Оставить подарок" form of the participant. */
export function giftPath(id: string): Route {
  return `/home/gift/${id}` as Route;
}
/** "Мой подарок": what the participant receives. */
export function myGiftPath(id: string): Route {
  return `/home/my-gift/${id}` as Route;
}
/** Task 9 pages: guess and reveal. */
export function guessPath(id: string): Route {
  return `/home/guess/${id}` as Route;
}
export function revealPath(id: string): Route {
  return `/home/reveal/${id}` as Route;
}
