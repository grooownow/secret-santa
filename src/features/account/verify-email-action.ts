import { and, eq, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { consumeTokenRow, revokeTokens } from "./tokens";

/**
 * Confirms the email behind a verification link and applies the registration
 * data bound to that very token (password, language, consent). Returns false
 * when the link is unknown, already used or older than 7 days. Called by the
 * page, not by the browser, so it is not a server action.
 *
 * The password comes from the token, never from the user row: whoever
 * registered an address first cannot keep a password on it once the owner of
 * the mailbox verifies through a later registration.
 */
export async function verifyEmailToken(token: string): Promise<boolean> {
  const row = await consumeTokenRow(token, "verify");
  if (!row) return false;
  const { userId, pending } = row;

  await getDb()
    .update(users)
    .set({
      emailVerified: new Date(),
      sessionVersion: sql`${users.sessionVersion} + 1`,
      ...(pending
        ? {
            passwordHash: pending.passwordHash,
            locale: pending.locale,
            consentVersion: pending.consentVersion,
            consentAt: pending.consentAt,
          }
        : {}),
    })
    // Already verified (e.g. by a reset link): do not touch the password.
    .where(and(eq(users.id, userId), isNull(users.emailVerified)));
  // Other pending links of this account must not apply their data later.
  await revokeTokens(userId, "verify");
  return true;
}
