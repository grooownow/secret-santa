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
import { sendVerifyEmail } from "./send-token-mail";
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

  // Hash before looking the email up, so a new and an existing address cost
  // the same time.
  const passwordHash = await hashPassword(password);
  const db = getDb();
  const [existing] = await db
    .select({ id: users.id, emailVerified: users.emailVerified })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  let target: { id: string; email: string; locale: string } | null = null;
  if (!existing) {
    const [created] = await db
      .insert(users)
      .values({
        email,
        passwordHash,
        locale,
        consentVersion: CONSENT_VERSION,
        consentAt: new Date(),
      })
      .onConflictDoNothing()
      .returning();
    target = created ?? null;
  } else if (!existing.emailVerified) {
    const [row] = await db
      .select({ id: users.id, email: users.email, locale: users.locale })
      .from(users)
      .where(eq(users.id, existing.id))
      .limit(1);
    target = row ?? null;
  }

  if (target && claimVerifySlot(email) === 0) {
    await sendVerifyEmail(target);
  }

  await setLocaleCookie(locale);
  redirect(`/check-email?email=${encodeURIComponent(email)}` as Route);
}
