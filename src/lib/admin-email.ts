import { env } from "./env";

/**
 * True when `email` is the organizer's address (`ADMIN_EMAIL`, compared
 * case-insensitively). It says nothing about verification; `isOrganizer`
 * also requires a verified account.
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  const admin = env.ADMIN_EMAIL?.trim().toLowerCase();
  return !!admin && !!email && email.trim().toLowerCase() === admin;
}
