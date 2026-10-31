import type { Route } from "next";

/**
 * The cabinet pages are built in later tasks, so typedRoutes does not know
 * `/home` yet. Remove the cast once the page exists.
 */
export const HOME = "/home" as Route;
