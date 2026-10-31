import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import { authTokens } from "@/db/schema";

/** Version of the consent text; bump it when the text changes. */
export const CONSENT_VERSION = "2026-10-31";

export type TokenPurpose = "verify" | "reset";

const HOUR_MS = 60 * 60 * 1000;
/** How long a link from an email works. */
export const TOKEN_TTL_MS: Record<TokenPurpose, number> = {
  verify: 7 * 24 * HOUR_MS,
  reset: HOUR_MS,
};

/** Only the SHA-256 of a token is stored, so a database leak yields no links. */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Creates a single-use token for the user and returns the raw value to put
 * into the email link. Older unused tokens of the same purpose stop working.
 */
export async function issueToken(
  userId: string,
  purpose: TokenPurpose,
): Promise<string> {
  const db = getDb();
  const token = randomBytes(32).toString("base64url");
  await db
    .delete(authTokens)
    .where(
      and(
        eq(authTokens.userId, userId),
        eq(authTokens.purpose, purpose),
        isNull(authTokens.usedAt),
      ),
    );
  await db.insert(authTokens).values({
    tokenHash: hashToken(token),
    userId,
    purpose,
    expiresAt: new Date(Date.now() + TOKEN_TTL_MS[purpose]),
  });
  return token;
}

/**
 * Spends the token: returns the user id if it is valid, unused and unexpired,
 * otherwise null. One atomic UPDATE, so two parallel clicks cannot both win.
 */
export async function consumeToken(
  token: string,
  purpose: TokenPurpose,
): Promise<string | null> {
  const now = new Date();
  const [row] = await getDb()
    .update(authTokens)
    .set({ usedAt: now })
    .where(
      and(
        eq(authTokens.tokenHash, hashToken(token)),
        eq(authTokens.purpose, purpose),
        isNull(authTokens.usedAt),
        gt(authTokens.expiresAt, now),
      ),
    )
    .returning();
  return row?.userId ?? null;
}

/** Read-only check, so a page can show "link expired" before asking for input. */
export async function tokenIsValid(
  token: string,
  purpose: TokenPurpose,
): Promise<boolean> {
  const [row] = await getDb()
    .select({ userId: authTokens.userId })
    .from(authTokens)
    .where(
      and(
        eq(authTokens.tokenHash, hashToken(token)),
        eq(authTokens.purpose, purpose),
        isNull(authTokens.usedAt),
        gt(authTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);
  return !!row;
}
