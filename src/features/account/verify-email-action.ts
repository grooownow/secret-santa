import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { consumeToken } from "./tokens";

/**
 * Confirms the email behind a verification link. Returns false when the link
 * is unknown, already used or older than 7 days. Called by the page, not by
 * the browser, so it is not a server action.
 */
export async function verifyEmailToken(token: string): Promise<boolean> {
  const userId = await consumeToken(token, "verify");
  if (!userId) return false;
  await getDb()
    .update(users)
    .set({ emailVerified: new Date() })
    .where(eq(users.id, userId));
  return true;
}
