import type { Route } from "next";

/**
 * Cabinet routes. The gift, wall and settings pages arrive in later tasks, so
 * typedRoutes does not know them yet; drop the casts once they exist.
 */
export const CABINET_HOME = "/home" as Route;
export const CABINET_GIFT = "/home/gift" as Route;
export const CABINET_WALL = "/home/wall" as Route;
export const CABINET_SETTINGS = "/home/settings" as Route;
export const NEW_PARTICIPANT = "/home/participants/new" as Route;

export function participantPath(id: string): Route {
  return `/home/participants/${id}` as Route;
}
