import type { Locale } from "@/i18n/locale";

const MAX_TEXT_LENGTH = 1500;

/** Google Translate link used as the fallback when auto-translation failed. */
export function translateUrl(text: string, target: Locale): string {
  const clipped = text.slice(0, MAX_TEXT_LENGTH);
  return `https://translate.google.com/?sl=auto&tl=${target}&text=${encodeURIComponent(clipped)}&op=translate`;
}
