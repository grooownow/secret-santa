import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { LOCALE_COOKIE, pickLocale } from "./locale";

// No locale routing: the language lives in the `locale` cookie. The config
// must always resolve a supported locale, otherwise next-intl calls notFound().
export default getRequestConfig(async () => {
  const [cookieStore, headerList] = await Promise.all([cookies(), headers()]);
  const locale = pickLocale(
    cookieStore.get(LOCALE_COOKIE)?.value,
    headerList.get("accept-language"),
  );
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
