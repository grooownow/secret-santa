"use client";

// global-error replaces the ROOT layout when it throws, so it renders its own
// <html><body> with no next-intl provider, no ThemeProvider and no fonts.
// globals.css is imported directly so the design tokens still apply. The
// language is resolved on the client (cookie, then browser language) from the
// statically imported messages; the first paint uses the default language.
import "./globals.css";
import { useEffect, useState } from "react";
import { ErrorScreen } from "@/components/error-screen";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  pickLocale,
  type Locale,
} from "@/i18n/locale";
import de from "../../messages/de.json";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import ru from "../../messages/ru.json";
import uk from "../../messages/uk.json";

const MESSAGES = { ru, uk, en, es, de } satisfies Record<Locale, unknown>;

function readCookie(name: string): string | undefined {
  const match = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : undefined;
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    setLocale(pickLocale(readCookie(LOCALE_COOKIE), navigator.language));
  }, []);

  const m = MESSAGES[locale];
  return (
    <html lang={locale}>
      <body>
        <ErrorScreen
          digest={error.digest}
          onRetry={reset}
          showHome={false}
          labels={{
            appName: m.app.name,
            ...m.error,
            footer: m.footer,
          }}
        />
      </body>
    </html>
  );
}
