import { eq } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { LOCALE_COOKIE, isLocale, pickLocale } from "@/i18n/locale";
import { registrationOpen } from "./game-phase";
import { getSettings } from "./game-settings";
import { logger } from "./logger";

/**
 * Policy hooks for Auth.js (Google sign-in, locale cookie). They live in `lib`
 * because `lib/auth.ts` wires them in and `lib` may not import a feature.
 */

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * Decides whether a Google sign-in may proceed. An existing email always may
 * (it opens the same account); a new email only while registration is open.
 * Also hardens account linking: if the existing account was created with a
 * password but never verified, whoever set that password did not prove they
 * own the mailbox, so the password is dropped and Google's proof of ownership
 * takes over.
 */
export async function googleSignInAllowed(
  email: string | null | undefined,
  emailVerified: boolean | undefined,
  now: Date = new Date(),
): Promise<boolean> {
  const normalized = email?.trim().toLowerCase();
  if (!normalized || emailVerified === false) return false;

  const db = getDb();
  const [existing] = await db
    .select({ id: users.id, emailVerified: users.emailVerified })
    .from(users)
    .where(eq(users.email, normalized))
    .limit(1);

  if (!existing) {
    return registrationOpen(now, await getSettings());
  }
  if (!existing.emailVerified) {
    await db
      .update(users)
      .set({ emailVerified: now, passwordHash: null })
      .where(eq(users.id, existing.id));
  }
  return true;
}

/**
 * A brand-new Google account: the email counts as verified, and the language
 * starts as whatever the visitor was already seeing.
 */
export async function onGoogleUserCreated(userId: string): Promise<void> {
  let locale = pickLocale(null, null);
  try {
    const [cookieStore, headerList] = await Promise.all([cookies(), headers()]);
    locale = pickLocale(
      cookieStore.get(LOCALE_COOKIE)?.value,
      headerList.get("accept-language"),
    );
  } catch (error) {
    logger.warn({ err: error }, "could not read the visitor's language");
  }
  await getDb()
    .update(users)
    .set({ emailVerified: new Date(), locale })
    .where(eq(users.id, userId));
}

/**
 * After a successful sign-in the interface follows the language stored in the
 * profile (it is also the language of emails). Runs from the Auth.js
 * `signIn` event, so it covers credentials and Google alike.
 */
export async function syncLocaleCookie(userId: string): Promise<void> {
  const [row] = await getDb()
    .select({ locale: users.locale })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!row || !isLocale(row.locale)) return;
  try {
    (await cookies()).set(LOCALE_COOKIE, row.locale, {
      path: "/",
      maxAge: ONE_YEAR_SECONDS,
      sameSite: "lax",
    });
  } catch (error) {
    logger.warn({ err: error }, "could not set the locale cookie");
  }
}
