"use server";

import { eq, sql } from "drizzle-orm";
import { redirect, unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { signIn } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { passwordSchema } from "./schemas";
import { consumeToken, revokeTokens } from "./tokens";

export interface ResetState {
  error?: "password" | "mismatch" | "expired";
}

const schema = z.object({
  token: z.string().min(1).max(200),
  password: passwordSchema,
  confirm: z.string(),
});

/**
 * Sets the new password from a reset link and signs the person in. The token
 * is spent only after the password passed validation, so a typo does not burn
 * the link.
 */
export async function resetPasswordAction(
  _prev: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const parsed = schema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return { error: formData.get("token") ? "password" : "expired" };
  }
  const { token, password, confirm } = parsed.data;
  if (password !== confirm) return { error: "mismatch" };

  const userId = await consumeToken(token, "reset");
  if (!userId) return { error: "expired" };

  const db = getDb();
  const [user] = await db
    .update(users)
    .set({
      passwordHash: await hashPassword(password),
      // A reset link proves the mailbox is theirs.
      emailVerified: sql`coalesce(${users.emailVerified}, now())`,
      // Sessions issued before the reset stop working.
      sessionVersion: sql`${users.sessionVersion} + 1`,
    })
    .where(eq(users.id, userId))
    .returning();
  if (!user) return { error: "expired" };
  // A pending registration link must not overwrite this new password later.
  await revokeTokens(userId, "verify");

  try {
    await signIn("credentials", {
      email: user.email,
      password,
      redirectTo: "/home",
    });
  } catch (error) {
    unstable_rethrow(error);
    redirect("/signin");
  }
  return {};
}
