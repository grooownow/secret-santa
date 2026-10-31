import type { Locale } from "@/i18n/locale";
import type { Translator } from "./translator";

/** Dev/test translator: `[de] text`. Never touches the network. */
export function createFakeTranslator(): Translator {
  return {
    async translate(text, _from, to) {
      const out: Partial<Record<Locale, string>> = {};
      for (const locale of to) out[locale] = `[${locale}] ${text}`;
      return out;
    },
  };
}
