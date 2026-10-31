import { ChevronDown } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { LOCALES, LOCALE_NAMES, LOCALE_SHORT, isLocale } from "@/i18n/locale";
import { setLocaleAction } from "./set-locale-action";

/**
 * Header language picker: `RU ▾` opening the list `RU · UA · EN · ES · DE`.
 * Native <details> plus one form of submit buttons, so it works without JS.
 */
export async function LanguageSwitcher() {
  const [current, t] = await Promise.all([
    getLocale(),
    getTranslations("language"),
  ]);
  const active = isLocale(current) ? current : "en";

  return (
    <details className="group relative">
      <summary
        aria-label={t("switch")}
        className="text-santa-ink flex cursor-pointer list-none items-center gap-1 text-xs [&::-webkit-details-marker]:hidden"
      >
        {LOCALE_SHORT[active]}
        <ChevronDown
          aria-hidden
          className="size-3.5 transition-transform group-open:rotate-180"
        />
      </summary>
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
            <span>{LOCALE_NAMES[locale]}</span>
            <span className="text-santa-muted text-xs">
              {LOCALE_SHORT[locale]}
            </span>
          </button>
        ))}
      </form>
    </details>
  );
}
