"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { auth } from "@/lib/auth";
import { HOME } from "./routes";
import { setLocaleCookie } from "./locale-cookie";
import { checkedSchema, localeSchema } from "./schemas";
import { CONSENT_VERSION } from "./tokens";

export interface ConsentState {
  error?: "consent" | "age" | "invalid";
}

const schema = z.object({
  locale: localeSchema,
  consent: checkedSchema,
  age14: checkedSchema,
});

/**
 * The one-time step after the first Google sign-in: language, consent and the
 * 14+ confirmation. Stores the consent with its date and text version.
 */
export async function acceptConsentAction(
  _prev: ConsentState,
  formData: FormData,
): Promise<ConsentState> {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  const parsed = schema.safeParse({
    locale: formData.get("locale"),
    consent: formData.get("consent"),
    age14: formData.get("age14"),
  });
  if (!parsed.success) {
    const failed = new Set(parsed.error.issues.map((i) => i.path[0]));
    return {
      error: failed.has("consent")
        ? "consent"
        : failed.has("age14")
          ? "age"
          : "invalid",
    };
  }

  await getDb()
    .update(users)
    .set({
      locale: parsed.data.locale,
      consentVersion: CONSENT_VERSION,
      consentAt: new Date(),
    })
    .where(eq(users.id, session.user.id));
  await setLocaleCookie(parsed.data.locale);
  redirect(HOME);
}
