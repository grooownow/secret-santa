"use server";

import { eq } from "drizzle-orm";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { getSettings, registrationOpen } from "@/features/game";
import { hashPassword } from "@/lib/password";
import { claimVerifySlot, underFormLimit } from "./cooldown";
import { setLocaleCookie } from "./locale-cookie";
import {
  checkedSchema,
  emailSchema,
  localeSchema,
  passwordSchema,
} from "./schemas";
import { queueRegistration } from "./send-token-mail";
import { CONSENT_VERSION } from "./tokens";

export type RegisterError =
  "email" | "password" | "consent" | "age" | "closed" | "rate" | "invalid";

export interface RegisterState {
  error?: RegisterError;
  email?: string;
  locale?: string;
}

const schema = z.object({
  email: emailSchema,
  password: passwordSchema,
  locale: localeSchema,
  consent: checkedSchema,
  age14: checkedSchema,
});

/**
 * Registration by email. The answer is the same for a new and an existing
 * address (always "check your email"), so the form cannot be used to find out
 * who has an account. An existing account is never changed: its password
 * stays, and an unverified one just gets a fresh verification email.
 */
export async function registerAction(
  _prev: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
    locale: formData.get("locale"),
    consent: formData.get("consent"),
    age14: formData.get("age14"),
  };
  const echo = {
    email: typeof raw.email === "string" ? raw.email : "",
    locale: typeof raw.locale === "string" ? raw.locale : undefined,
  };

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const failed = new Set(parsed.error.issues.map((i) => i.path[0]));
    const error: RegisterError = failed.has("email")
      ? "email"
      : failed.has("password")
        ? "password"
        : failed.has("consent")
          ? "consent"
          : failed.has("age14")
            ? "age"
            : "invalid";
    return { error, ...echo };
  }
  const { email, password, locale } = parsed.data;

  if (!underFormLimit("register", email)) return { error: "rate", ...echo };
  if (!registrationOpen(new Date(), await getSettings())) {
    return { error: "closed", ...echo };
  }

  // Hash before looking the email up, so every branch costs the same time.
  const passwordHash = await hashPassword(password);
  const [existing] = await getDb()
    .select({ id: users.id, emailVerified: users.emailVerified })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  // The password and consent are NOT written to the user row. They travel
  // with the verify token and are applied when that token is used, so the
  // owner of the mailbox, not whoever registered first, decides the password.
  // A later registration of an unverified address replaces the earlier token.
  if (!existing?.emailVerified) {
    queueRegistration(email, existing?.id ?? null, {
      passwordHash,
      locale,
      consentVersion: CONSENT_VERSION,
      consentAt: new Date(),
    });
  }
  // Starts the 60 second "send again" countdown shown on /check-email. Not a
  // gate here: a second registrant must still get their own link.
  claimVerifySlot(email);

  await setLocaleCookie(locale);
  redirect(`/check-email?email=${encodeURIComponent(email)}` as Route);
}
