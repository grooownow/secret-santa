import { and, eq, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { consumeTokenRow, hashNonce, issueToken, revokeTokens } from "./tokens";

export type VerifyResult =
  | { status: "invalid" }
  | { status: "verified" }
  /** Mailbox confirmed, but the owner must choose a password themselves. */
  | { status: "choose-password"; resetToken: string };

/**
 * Confirms the email behind a verification link. Called by the page, not by
 * the browser, so it is not a server action.
 *
 * The password and consent chosen at registration are applied only when the
 * browser opening the link holds the registration nonce stored on this very
 * token. Otherwise (another device, or a link triggered by somebody who
 * registered this address) the mailbox is still marked verified, but nothing
 * from the registration is applied: the owner gets a fresh reset link and
 * chooses their own password, and consent comes through /welcome.
 */
export async function verifyEmailToken(
  token: string,
  browserNonce: string | undefined,
): Promise<VerifyResult> {
  const row = await consumeTokenRow(token, "verify");
  if (!row) return { status: "invalid" };
  const { userId, pending } = row;

  const sameBrowser =
    !!pending &&
    !!browserNonce &&
    hashNonce(browserNonce) === pending.nonceHash;

  const [updated] = await getDb()
    .update(users)
    .set({
      emailVerified: new Date(),
      sessionVersion: sql`${users.sessionVersion} + 1`,
      ...(sameBrowser
        ? {
            passwordHash: pending.passwordHash,
            locale: pending.locale,
            consentVersion: pending.consentVersion,
            consentAt: pending.consentAt,
          }
        : {}),
    })
    // Already verified (e.g. by a reset link): do not touch the account.
    .where(and(eq(users.id, userId), isNull(users.emailVerified)))
    .returning();
  // Other pending links of this account must not apply their data later.
  await revokeTokens(userId, "verify");

  if (!updated || sameBrowser) return { status: "verified" };
  return {
    status: "choose-password",
    resetToken: await issueToken(userId, "reset"),
  };
}
