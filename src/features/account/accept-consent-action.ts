"use server";

import { eq } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { getSessionUser } from "@/lib/session";
import { HOME } from "./routes";
import { setLocaleCookie } from "./locale-cookie";
import { LOCALE_COOKIE, pickLocale } from "@/i18n/locale";
import { checkedSchema } from "./schemas";
import { CONSENT_VERSION } from "./tokens";

export interface ConsentState {
  error?: "consent" | "age" | "invalid";
}

const schema = z.object({
  consent: checkedSchema,
  age14: checkedSchema,
});

/**
 * The one-time step after the first Google sign-in: consent and the 14+
 * confirmation. Stores the consent with its date and text version, and the
 * language the page was shown in (the header switcher's cookie, else the
 * browser's), resolved exactly like `src/i18n/request.ts` does. There is no
 * language field: a posted `locale` is ignored.
 */
export async function acceptConsentAction(
  _prev: ConsentState,
  formData: FormData,
): Promise<ConsentState> {
  const user = await getSessionUser();
  if (!user) redirect("/signin");

  const parsed = schema.safeParse({
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

  const [cookieStore, headerList] = await Promise.all([cookies(), headers()]);
  const locale = pickLocale(
    cookieStore.get(LOCALE_COOKIE)?.value,
    headerList.get("accept-language"),
  );

  await getDb()
    .update(users)
    .set({
      locale,
      consentVersion: CONSENT_VERSION,
      consentAt: new Date(),
    })
    .where(eq(users.id, user.id));
  await setLocaleCookie(locale);
  // Tabs are prefetched and kept in the browser (staleTimes): drop that
  // cache so every cabinet tab shows the change.
  revalidatePath("/home", "layout");
  redirect(HOME);
}
