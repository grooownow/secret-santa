import type { Metadata } from "next";
import "./globals.css";
import { Bricolage_Grotesque, Outfit } from "next/font/google";
import { getLocale, getTranslations } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";
import { AnalyticsProvider } from "@/components/analytics-provider";
import { env } from "@/lib/env";

const outfit = Outfit({
  subsets: ["latin", "latin-ext"],
  variable: "--font-outfit",
});
const bricolage = Bricolage_Grotesque({
  subsets: ["latin", "latin-ext"],
  variable: "--font-bricolage",
});

const OG_LOCALES: Record<string, string> = {
  ru: "ru_RU",
  uk: "uk_UA",
  en: "en_US",
  es: "es_ES",
  de: "de_DE",
};

// Localized by the visitor's interface language. Nothing here reads the
// database, so error pages can still render when it is down.
export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getTranslations("meta"), getLocale()]);
  return {
    metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
    title: {
      default: t("title"),
      template: `%s · ${t("siteName")}`,
    },
    description: t("description"),
    openGraph: {
      siteName: t("siteName"),
      title: t("title"),
      description: t("description"),
      type: "website",
      locale: OG_LOCALES[locale] ?? "en_US",
    },
    // The site is for neighbours only: keep it out of every search index.
    robots: { index: false, follow: false },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  return (
    <html
      lang={locale}
      className={cn("font-sans", outfit.variable, bricolage.variable)}
      suppressHydrationWarning
    >
      <body>
        <NextIntlClientProvider>
          <ThemeProvider>
            <AnalyticsProvider>{children}</AnalyticsProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
