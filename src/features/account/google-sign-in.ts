"use server";

import { signIn } from "@/lib/auth";
import { safeCallbackUrl } from "@/lib/callback-url";

/**
 * Starts Google sign-in. `redirectTo` is re-validated here because bound
 * server-action arguments are still input. A brand-new Google account lands
 * on /home and is sent on to /welcome until the consent is given.
 */
export async function googleSignInAction(
  redirectTo: string | undefined,
): Promise<void> {
  await signIn("google", {
    redirectTo: safeCallbackUrl(redirectTo) ?? "/home",
  });
}
