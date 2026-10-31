import { cookies } from "next/headers";
import { LOCALE_COOKIE, type Locale } from "@/i18n/locale";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export async function setLocaleCookie(locale: Locale): Promise<void> {
  (await cookies()).set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
    sameSite: "lax",
  });
}
