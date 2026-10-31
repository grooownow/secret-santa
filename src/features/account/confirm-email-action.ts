"use server";

import type { Route } from "next";
import { redirect } from "next/navigation";
import { z } from "zod";
import { readRegistrationNonce } from "./registration-nonce";
import { verifyEmailToken } from "./verify-email-action";

const schema = z.object({ token: z.string().min(1).max(200) });

/**
 * The "Confirm my email" button on /verify-email. The link in the mail only
 * renders that button; the token is spent here, on the POST, because mail
 * scanners (Safe Links and the like) open links but do not submit forms.
 */
export async function confirmEmailAction(formData: FormData): Promise<void> {
  const parsed = schema.safeParse({ token: formData.get("token") });
  if (!parsed.success) redirect("/verify-email" as Route);

  const result = await verifyEmailToken(
    parsed.data.token,
    await readRegistrationNonce(),
  );
  if (result.status === "choose-password") {
    // Opened elsewhere than where the registration happened: the mailbox is
    // confirmed, the owner now picks their own password.
    redirect(
      `/reset-password?token=${encodeURIComponent(result.resetToken)}` as Route,
    );
  }
  redirect(
    (result.status === "verified"
      ? "/verify-email?confirmed=1"
      : "/verify-email") as Route,
  );
}
