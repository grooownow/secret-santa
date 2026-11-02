import { eq } from "drizzle-orm";
import { cache } from "react";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { auth } from "./auth";

export interface SessionUser {
  id: string;
  email: string | null;
  name?: string | null;
}

/**
 * The signed-in user of this request, or null. The single gate every server
 * action, route and guard goes through instead of calling `auth()` directly:
 * besides the JWT check it compares the token's session version with
 * `users.sessionVersion`, so a session issued before the account was
 * verified, reset or taken over by Google is treated as signed out. A token
 * without a version (issued before this check existed) is stale too. A
 * missing user row is also "not signed in".
 *
 * Memoized per server request (React `cache`): the layout, the page and every
 * query guard of one render ask this, and each ask used to be a database
 * round trip.
 */
export const getSessionUser = cache(
  async function getSessionUser(): Promise<SessionUser | null> {
    const session = await auth();
    if (!session?.user?.id) return null;

    const [row] = await getDb()
      .select({ sessionVersion: users.sessionVersion })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);
    if (!row || session.sessionVersion !== row.sessionVersion) return null;

    return {
      id: session.user.id,
      email: session.user.email ?? null,
      name: session.user.name,
    };
  },
);
