import type { Route } from "next";

/**
 * Admin routes. Participants, backup and settings are built in a later task,
 * so typedRoutes does not know them yet; drop the casts once they exist.
 */
export const ADMIN_HOME = "/admin" as Route;
export const ADMIN_PARTICIPANTS = "/admin/participants" as Route;
export const ADMIN_BACKUP = "/admin/backup" as Route;
export const ADMIN_SETTINGS = "/admin/settings" as Route;
