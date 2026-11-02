import { PageMain } from "@/components/page-main";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { CONSENT_VERSION } from "@/features/account";
import { SiteHeader, getSettings } from "@/features/game";
import { RulesContent } from "@/features/landing";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("rules");
  return { title: t("title") };
}

export default async function RulesPage() {
  const [locale, settings] = await Promise.all([getLocale(), getSettings()]);
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <PageMain className="py-7">
        <RulesContent
          settings={settings}
          locale={locale}
          version={CONSENT_VERSION}
        />
      </PageMain>
    </div>
  );
}
