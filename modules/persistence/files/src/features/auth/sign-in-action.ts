"use server";

import { z } from "zod";
import { signIn } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { safeCallbackUrl } from "./callback-url";

const schema = z.object({
  // Normalised so the rate-limit bucket keys on one canonical form — otherwise
  // varying the case would hand an attacker a fresh bucket per spelling.
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(1),
  redirectTo: z.string().optional(),
});

/**
 * Credentials sign-in. Follows the security.md boundary pattern: rate-limit
 * the public endpoint, validate with zod, then hand off to Auth.js. A failed
 * credential check surfaces as a thrown Auth.js error caught here and mapped
 * to a generic message (never reveal whether the email exists).
 */
export async function signInWithPassword(input: {
  email: string;
  password: string;
  redirectTo?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Enter a valid email and password." };
  }

  const limit = rateLimit(`signin:${parsed.data.email}`, {
    limit: 10,
    windowMs: 60_000,
  });
  if (!limit.allowed) {
    return { ok: false, error: "Too many attempts — wait a minute and retry." };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: parsed.data.redirectTo ?? "/dashboard",
    });
    return { ok: true };
  } catch (error) {
    // next-auth throws a redirect on success (NEXT_REDIRECT) — rethrow so the
    // framework performs the navigation; only a real auth failure is a value.
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof (error as { digest?: unknown }).digest === "string" &&
      (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    return { ok: false, error: "Invalid email or password." };
  }
}

/** State surfaced under the sign-in form; `email` is echoed back so a failed
 * attempt keeps what the user typed. */
export interface SignInFormState {
  error?: string;
  email?: string;
}

/**
 * `useActionState`-shaped wrapper around {@link signInWithPassword} for the
 * client sign-in form. On success `signIn` throws NEXT_REDIRECT, which
 * propagates out of `signInWithPassword` and this function to drive the
 * navigation; on failure it returns the generic error plus the submitted
 * email so the field can be repopulated. `redirectTo` comes from a form field
 * the client controls, so it is re-validated with `safeCallbackUrl` here —
 * never trusted as-is.
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
