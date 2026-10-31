import { getTranslations } from "next-intl/server";
import { SiteFooter, SiteHeader } from "@/features/game";

// Lives outside the (site) group on purpose: that group redirects here.
export default async function ClosedPage() {
  const t = await getTranslations("closed");
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex flex-1 flex-col gap-5 px-[26px] py-7">
        <h1 className="text-[26px] leading-tight font-bold">{t("title")}</h1>
        <p className="text-santa-muted text-sm leading-relaxed">{t("text")}</p>
      </main>
      <SiteFooter />
    </div>
  );
}
