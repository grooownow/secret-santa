import { env } from "@/lib/env";
import type { Locale } from "@/i18n/locale";
import { createFakeTranslator } from "./fake-translator";
import { createGroqTranslator } from "./groq-translator";

/**
 * The one seam to the translation service. Only the text itself is ever
 * passed in: never a name, building or apartment. Replacing the service means
 * replacing this module's implementation, nothing else.
 */
export interface Translator {
  translate(
    text: string,
    from: Locale | "auto",
    to: Locale[],
  ): Promise<Partial<Record<Locale, string>>>;
}

let override: Translator | null = null;

/** Disabled translator: returns nothing, so originals stay on screen. */
const disabled: Translator = { translate: async () => ({}) };

/** True when a real or fake translator will actually produce translations. */
export function translationEnabled(): boolean {
  if (override || env.NODE_ENV === "test") return true;
  return Boolean(env.GROQ_API_KEY) || env.NODE_ENV !== "production";
}

/**
 * Groq when `GROQ_API_KEY` is set; otherwise a fake outside production and a
 * disabled translator in production (the UI then shows the original and the
 * Google Translate link). The network is never touched without a key.
 */
export function getTranslator(): Translator {
  if (override) return override;
  // Tests never reach Groq, whatever the environment holds.
  if (env.NODE_ENV === "test") return createFakeTranslator();
  if (env.GROQ_API_KEY) {
    return createGroqTranslator(env.GROQ_API_KEY, env.GROQ_MODEL);
  }
  return env.NODE_ENV === "production" ? disabled : createFakeTranslator();
}

/** Test hook: pass a translator to take over, or `null` to restore. */
export function setTranslatorForTests(translator: Translator | null): void {
  override = translator;
}
