"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { underFormLimit } from "./cooldown";
import { emailSchema } from "./schemas";
import { sendResetEmail } from "./send-token-mail";

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

  if (!underFormLimit("forgot", email)) return { status: "rate", email };

  const [user] = await getDb()
    .select({ id: users.id, email: users.email, locale: users.locale })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (user) await sendResetEmail(user);

  return { status: "sent", email };
}
