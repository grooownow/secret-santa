import { and, eq, sql } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { getDb } from "@/db/client";
import { authTokens, users } from "@/db/schema";
import { LOCALE_COOKIE, isLocale, pickLocale } from "@/i18n/locale";
import { isAdminEmail } from "./admin-email";
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
 * (it opens the same account); a new email only while registration is open,
 * except `ADMIN_EMAIL`, which may always sign up.
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
    // The organizer can always come back, even after the deadline, so the
    // admin area is never lost for the rest of the game.
    return (
      isAdminEmail(normalized) || registrationOpen(now, await getSettings())
    );
  }
  if (!existing.emailVerified) {
    // Whoever registered this address never proved they own the mailbox, so
    // nothing they set survives: password, consent, pending verify links and
    // sessions are all dropped. The owner starts over at /welcome.
    await db
      .update(users)
      .set({
        emailVerified: now,
        passwordHash: null,
        consentAt: null,
        consentVersion: null,
        sessionVersion: sql`${users.sessionVersion} + 1`,
      })
      .where(eq(users.id, existing.id));
    await db
      .delete(authTokens)
      .where(
        and(
          eq(authTokens.userId, existing.id),
          eq(authTokens.purpose, "verify"),
        ),
      );
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

/**
 * Provider allowlist for the Auth.js `signIn` callback: only credentials
 * (checked in `authorize`) and Google (checked here). Anything else, such as
 * a provider added by mistake, is refused.
 */
export async function signInPolicy(
  provider: string | undefined,
  email: string | null | undefined,
  emailVerified: boolean | undefined,
): Promise<boolean> {
  if (provider === "credentials") return true;
  if (provider !== "google") return false;
  return googleSignInAllowed(email, emailVerified);
}

/** The session version to stamp on a JWT issued at sign-in. */
export async function currentSessionVersion(userId: string): Promise<number> {
  const [row] = await getDb()
    .select({ sessionVersion: users.sessionVersion })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row?.sessionVersion ?? 0;
}
