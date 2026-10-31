import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

export const REGISTRATION_NONCE_COOKIE = "reg_nonce";
const SEVEN_DAYS_SECONDS = 7 * 24 * 60 * 60;

/**
 * Marks the browser that registers. A random value goes into an httpOnly
 * cookie; only its hash is kept on the verify token. The password chosen at
 * registration is applied only when the link is opened in a browser holding
 * the same value, so someone who registers another person's address cannot
 * make that person's click set the attacker's password.
 *
 * A browser that already holds a nonce keeps it, so submitting the form twice
 * (the second time sends no new mail, see `claimVerifySlot`) does not orphan
 * the link from the first submission.
 */
export async function startRegistrationNonce(): Promise<string> {
  const store = await cookies();
  const nonce =
    store.get(REGISTRATION_NONCE_COOKIE)?.value ??
    randomBytes(32).toString("base64url");
  store.set(REGISTRATION_NONCE_COOKIE, nonce, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SEVEN_DAYS_SECONDS,
  });
  return nonce;
}

export async function readRegistrationNonce(): Promise<string | undefined> {
  return (await cookies()).get(REGISTRATION_NONCE_COOKIE)?.value;
}
