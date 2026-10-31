import type { Route } from "next";

/**
 * Admin routes. typedRoutes learns new pages only at the next `next dev` or
 * `build`, so the helpers cast on purpose (see docs/gridfin-template-gaps.md).
 */
export const ADMIN_HOME = "/admin" as Route;
export const ADMIN_PARTICIPANTS = "/admin/participants" as Route;
export const ADMIN_BACKUP = "/admin/backup" as Route;
export const ADMIN_SETTINGS = "/admin/settings" as Route;

/** Confirmation page of a withdrawal (frame ksxL7). */
export function withdrawPath(id: string): Route {
  return `/admin/participants/${id}/withdraw` as Route;
}
