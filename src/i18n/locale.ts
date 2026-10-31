export const LOCALES = ["ru", "uk", "en", "es", "de"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "locale";

/** Short interface label: `RU · UA · EN · ES · DE`. */
export const LOCALE_SHORT: Record<Locale, string> = {
  ru: "RU",
  uk: "UA",
  en: "EN",
  es: "ES",
  de: "DE",
};

/** Names shown on the language selection screen, each in its own language. */
export const LOCALE_NAMES: Record<Locale, string> = {
  ru: "Русский",
  uk: "Українська",
  en: "English",
  es: "Español",
  de: "Deutsch",
};

export function isLocale(value: unknown): value is Locale {
  return (
    typeof value === "string" && (LOCALES as readonly string[]).includes(value)
  );
}

/** Parses `Accept-Language` into primary subtags ordered by q-weight. */
function acceptedLanguages(header: string): string[] {
  return header
    .split(",")
    .map((part, index) => {
      const [tag = "", ...params] = part.trim().split(";");
      const q = params
        .map((p) => p.trim())
        .find((p) => p.startsWith("q="))
        ?.slice(2);
      const weight = q === undefined ? 1 : Number(q);
      return {
        lang: tag.trim().toLowerCase().split("-")[0] ?? "",
        weight: Number.isFinite(weight) ? weight : 0,
        index,
      };
    })
    .filter((entry) => entry.lang && entry.weight > 0)
    .sort((a, b) => b.weight - a.weight || a.index - b.index)
    .map((entry) => entry.lang);
}

/**
 * Cookie wins, then the browser's language, then English. Always returns a
 * supported locale, so the app never needs a 404 for an unknown language.
 */
export function pickLocale(
  cookie: string | null | undefined,
  acceptLanguage: string | null | undefined,
): Locale {
  if (isLocale(cookie)) return cookie;
  for (const lang of acceptedLanguages(acceptLanguage ?? "")) {
    if (isLocale(lang)) return lang;
  }
  return DEFAULT_LOCALE;
}
