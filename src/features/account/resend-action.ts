"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { claimVerifySlot, RESEND_SECONDS } from "./cooldown";
import { emailSchema } from "./schemas";
import { readRegistrationNonce } from "./registration-nonce";
import { queueVerifyEmail } from "./send-token-mail";

export interface ResendState {
  status?: "sent" | "wait" | "invalid";
  /** Seconds until the next send is allowed. */
  retryAfter?: number;
  email?: string;
}

/**
 * "Send again" for the verification email, at most once per 60 seconds per
 * address. An unknown or already verified address gets the same "sent" answer
 * and no email, so this cannot be used to probe for accounts.
 */
export async function resendVerificationAction(
  _prev: ResendState,
  formData: FormData,
): Promise<ResendState> {
  const parsed = z
    .object({ email: emailSchema })
    .safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    const email = formData.get("email");
    return { status: "invalid", email: typeof email === "string" ? email : "" };
  }
  const { email } = parsed.data;

  const wait = claimVerifySlot(email);
  if (wait > 0) return { status: "wait", retryAfter: wait, email };

  const [user] = await getDb()
    .select({
      id: users.id,
      email: users.email,
      locale: users.locale,
      emailVerified: users.emailVerified,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  // Keeps what the latest registration chose; the token is issued and mailed
  // after the response so unknown addresses answer in the same time.
  if (user && !user.emailVerified)
    queueVerifyEmail(user, { nonce: await readRegistrationNonce() });

  return { status: "sent", retryAfter: RESEND_SECONDS, email };
}
