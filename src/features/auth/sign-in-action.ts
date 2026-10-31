"use server";

import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { signIn } from "@/lib/auth";
import { safeCallbackUrl } from "./callback-url";

const schema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(1),
  redirectTo: z.string().optional(),
});

export type SignInError = "invalid_input" | "credentials";

/**
 * Credentials sign-in. Validates with zod, then hands off to Auth.js. Rate
 * limiting lives in `authorizeCredentials` (src/lib/auth.ts), so a direct POST
 * to the Auth.js endpoint is throttled as well. A failed check is a generic
 * error that never says whether the email exists. After a successful sign-in
 * the Auth.js `signIn` event sets the `locale` cookie from `users.locale`.
 */
export async function signInWithPassword(input: {
  email: string;
  password: string;
  redirectTo?: string;
}): Promise<{ ok: true } | { ok: false; error: SignInError }> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: parsed.data.redirectTo ?? "/home",
    });
    return { ok: true };
  } catch (error) {
    // Auth.js throws a redirect on success; let Next perform the navigation.
    unstable_rethrow(error);
    return { ok: false, error: "credentials" };
  }
}

/** State surfaced under the sign-in form; `email` is echoed back so a failed
 * attempt keeps what the user typed. */
export interface SignInFormState {
  error?: SignInError;
  email?: string;
}

/**
 * `useActionState`-shaped wrapper around {@link signInWithPassword}.
 * `redirectTo` comes from a hidden field, so it is re-validated with
 * `safeCallbackUrl` — never trusted as-is.
 */
export async function signInFormAction(
  _prevState: SignInFormState,
  formData: FormData,
): Promise<SignInFormState> {
  const email = String(formData.get("email") ?? "");
  const result = await signInWithPassword({
    email,
    password: String(formData.get("password") ?? ""),
    redirectTo: safeCallbackUrl(formData.get("redirectTo")?.toString()),
  });
  return result.ok ? {} : { error: result.error, email };
}
