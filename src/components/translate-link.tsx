import { getLocale, getTranslations } from "next-intl/server";
import { isLocale } from "@/i18n/locale";
import { translateUrl } from "@/lib/translate-url";

/**
 * Fallback when auto-translation failed: opens Google Translate with the
 * original text in a new tab.
 */
export async function TranslateLink({ text }: { text: string }) {
  const [locale, t] = await Promise.all([
    getLocale(),
    getTranslations("translate"),
  ]);
  const target = isLocale(locale) ? locale : "en";

  return (
    <a
      href={translateUrl(text, target)}
      target="_blank"
      rel="noopener noreferrer"
      title={t("opensInNewTab")}
      className="text-santa-green text-xs font-semibold underline-offset-4 hover:underline"
    >
      {t("button")}
    </a>
  );
}
