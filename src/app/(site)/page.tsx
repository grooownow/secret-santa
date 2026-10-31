import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { getSettings } from "@/features/game";
import { LandingPage, gameDates } from "@/features/landing";
import { getSessionUser } from "@/lib/session";

// Link preview for the house chat: title and description from the spec, with
// the dates taken from the settings.
export async function generateMetadata(): Promise<Metadata> {
  const [t, locale, settings] = await Promise.all([
    getTranslations(),
    getLocale(),
    getSettings(),
  ]);
  const title = t("meta.title");
  const description = t("landing.metaDescription", gameDates(settings, locale));
  return {
    title: { absolute: title },
    description,
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function HomePage() {
  const [locale, settings, user] = await Promise.all([
    getLocale(),
    getSettings(),
    getSessionUser(),
  ]);
  return (
    <LandingPage
      settings={settings}
      now={new Date()}
      locale={locale}
      signedIn={!!user}
    />
  );
}
