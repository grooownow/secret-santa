import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { getSessionUser, type SessionUser } from "@/lib/session";
import { env } from "@/lib/env";

export type { SessionUser } from "@/lib/session";

/**
 * Defense-in-depth guard for protected server components and server
 * actions. `src/middleware.ts` only performs an optimistic, local
 * cookie/JWT check (spec §5.6-2) — it never touches the database. This
 * calls `getSessionUser()` (JWT plus the session-version check) and redirects to
 * `/signin` when there's no authenticated session, so every protected data
 * access has its own, independent authorization check rather than trusting
 * middleware alone.
 */
export async function requireUser(): Promise<SessionUser> {
  const sessionUser = await getSessionUser();

  if (!sessionUser && env.AUTH_DEV_BYPASS) {
    // Dev bypass: act as the seeded admin so local runs skip sign-in. This
    // reads a real db row so downstream writes scoped to user.id hit a real
    // user. Guarded off in production by src/lib/env.ts.
    const rows = await getDb()
      .select()
      .from(users)
      .where(eq(users.email, env.SEED_ADMIN_EMAIL))
      .limit(1);
    const admin = rows[0];
    if (admin) {
      return { id: admin.id, email: admin.email, name: admin.name };
    }
  }

  if (!sessionUser) {
    redirect("/signin");
  }

  return sessionUser;
}
