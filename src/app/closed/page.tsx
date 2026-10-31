import type { ReactNode } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { SiteFooter, SiteHeader, getSettings } from "@/features/game";

const TELEGRAM_URL = "https://t.me/ludvik4";

function telegramLink(chunks: ReactNode) {
  return (
    <a
      href={TELEGRAM_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="text-santa-green font-semibold underline"
    >
      {chunks}
    </a>
  );
}

// Lives outside the (site) group on purpose: that group redirects here.
export default async function ClosedPage() {
  const t = await getTranslations("closed");
  const locale = await getLocale();
  const { closeOn } = await getSettings();
  const date = new Intl.DateTimeFormat(locale, {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(`${closeOn}T12:00:00Z`));
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex flex-1 flex-col gap-5 px-[26px] py-7">
        <h1 className="text-[26px] leading-tight font-bold">{t("title")}</h1>
        <p className="text-santa-muted text-sm leading-relaxed">{t("text")}</p>
        <section className="bg-santa-mint flex flex-col gap-1.5 rounded-2xl p-[18px]">
          <h2 className="text-santa-green text-[17px] font-bold">
            {t("cardTitle")}
          </h2>
          <p className="text-santa-ink text-[13px] leading-relaxed">
            {t("cardText", { date })}
          </p>
        </section>
        <p className="text-santa-ink text-[13px] leading-relaxed">
          {t.rich("organizer", {
            link: telegramLink,
          })}
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
