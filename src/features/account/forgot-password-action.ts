"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { claimResetSlot, underFormLimit, underIpLimit } from "./cooldown";
import { emailSchema } from "./schemas";
import { queueResetEmail } from "./send-token-mail";

export interface ForgotState {
  status?: "sent" | "invalid" | "rate";
  email?: string;
}

/**
 * Sends a reset link when the address has an account. The answer is "sent"
 * either way, so it does not reveal who is registered.
 */
export async function forgotPasswordAction(
  _prev: ForgotState,
  formData: FormData,
): Promise<ForgotState> {
  const rawEmail = formData.get("email");
  const echo = typeof rawEmail === "string" ? rawEmail : "";
  const parsed = z
    .object({ email: emailSchema })
    .safeParse({ email: rawEmail });
  if (!parsed.success) return { status: "invalid", email: echo };
  const { email } = parsed.data;

  if (!underFormLimit("forgot", email) || !(await underIpLimit("forgot"))) {
    return { status: "rate", email };
  }
  // One reset mail per address per 60 seconds; a repeat answers the same.
  if (claimResetSlot(email) > 0) return { status: "sent", email };

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
  if (user) queueResetEmail(user);

  return { status: "sent", email };
}
