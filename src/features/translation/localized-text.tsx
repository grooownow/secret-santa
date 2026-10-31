import { getLocale, getTranslations } from "next-intl/server";
import { TranslateLink } from "@/features/game";
import { isLocale, type Locale } from "@/i18n/locale";
import { TranslationToggle } from "./translation-toggle";

/**
 * A user's text in the viewer's interface language. Same language: plain
 * text. Translation exists: the translation plus «Show original». No
 * translation yet: the original plus the Google Translate link.
 * `translated` comes from `getLocalized` for the viewer's locale.
 */
export async function LocalizedText({
  original,
  translated,
  sourceLocale,
}: {
  original: string;
  translated: string | null;
  sourceLocale: Locale;
}) {
  const [locale, t] = await Promise.all([
    getLocale(),
    getTranslations("translate"),
  ]);
  const viewer = isLocale(locale) ? locale : "en";

  if (sourceLocale === viewer) {
    return <span className="whitespace-pre-line">{original}</span>;
  }
  if (translated) {
    return (
      <TranslationToggle
        original={original}
        translated={translated}
        showOriginalLabel={t("showOriginal")}
        showTranslationLabel={t("showTranslation")}
      />
    );
  }
  return (
    <>
      <span className="whitespace-pre-line">{original}</span>{" "}
      <TranslateLink text={original} />
    </>
  );
}
