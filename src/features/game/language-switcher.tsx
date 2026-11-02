import { getLocale, getTranslations } from "next-intl/server";
import { LOCALES, LOCALE_NAMES, LOCALE_SHORT, isLocale } from "@/i18n/locale";
import { LanguageMenu } from "./language-menu";
import { setLocaleAction } from "./set-locale-action";
import { PendingSpinner } from "@/components/spinner";

/**
 * Header language picker: `RU ▾` opening the list `RU · UA · EN · ES · DE`.
 * Data (locale, translations) stays on the server; open/close lives in the
 * client `LanguageMenu`, the list is one form of submit buttons.
 */
export async function LanguageSwitcher() {
  const [current, t] = await Promise.all([
    getLocale(),
    getTranslations("language"),
  ]);
  const active = isLocale(current) ? current : "en";

  return (
    <LanguageMenu label={t("switch")} current={LOCALE_SHORT[active]}>
      <form
        action={setLocaleAction}
        className="border-santa-line bg-santa-white absolute right-0 z-10 mt-2 flex w-44 flex-col rounded-xl border p-1"
      >
        {LOCALES.map((locale) => (
          <button
            key={locale}
            type="submit"
            name="locale"
            value={locale}
            aria-current={locale === active ? "true" : undefined}
            className="text-santa-ink hover:bg-santa-mint flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm aria-[current=true]:font-semibold"
          >
            <span lang={locale}>{LOCALE_NAMES[locale]}</span>
            <span className="text-santa-muted flex items-center gap-1.5 text-xs">
              <PendingSpinner
                field="locale"
                value={locale}
                className="size-3.5"
              />
              {LOCALE_SHORT[locale]}
            </span>
          </button>
        ))}
      </form>
    </LanguageMenu>
  );
}
