import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { env } from "@/lib/env";
import { requireUser } from "./require-user";

/** The signed-in user's row, never carrying the password hash. */
export type Account = Omit<typeof users.$inferSelect, "passwordHash">;

/**
 * Guard for pages and actions of the participant area. Builds on
 * `requireUser()` (session check, dev bypass) and additionally loads the user
 * row, so a session that outlived its row (deleted account, reset database)
 * is sent back to `/signin` instead of failing deeper in the app.
 */
export async function requireAccount(): Promise<Account> {
  const user = await requireUser();
  const [row] = await getDb()
    .select()
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);
  if (!row) {
    redirect("/signin");
  }
  const { passwordHash: _passwordHash, ...account } = row;
  return account;
}

/** Like `requireAccount`, but the email must be confirmed first. */
export async function requireVerifiedAccount(): Promise<Account> {
  const account = await requireAccount();
  if (!account.emailVerified) {
    redirect("/verify");
  }
  return account;
}

/**
 * Organizer-only guard: the verified account whose email equals `ADMIN_EMAIL`
 * (case-insensitive). Anyone else gets a 404, so the admin area does not
 * reveal that it exists.
 */
export async function requireOrganizer(): Promise<Account> {
  const account = await requireAccount();
  const adminEmail = env.ADMIN_EMAIL?.trim().toLowerCase();
  if (
    !adminEmail ||
    !account.emailVerified ||
    account.email.trim().toLowerCase() !== adminEmail
  ) {
    notFound();
  }
  return account;
}
