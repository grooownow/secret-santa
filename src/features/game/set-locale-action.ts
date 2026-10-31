"use server";

import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { auth } from "@/lib/auth";
import { LOCALE_COOKIE, LOCALES } from "@/i18n/locale";

const schema = z.object({ locale: z.enum(LOCALES) });

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * Switches the interface language: always writes the `locale` cookie and, for
 * a signed-in user, also `users.locale` (used for emails). Works for guests.
 */
export async function setLocaleAction(formData: FormData): Promise<void> {
  const parsed = schema.safeParse({ locale: formData.get("locale") });
  if (!parsed.success) return;
  const { locale } = parsed.data;

  (await cookies()).set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
    sameSite: "lax",
  });

  const session = await auth();
  if (session?.user?.id) {
    await getDb()
      .update(users)
      .set({ locale })
      .where(eq(users.id, session.user.id));
  }

  revalidatePath("/", "layout");
}
