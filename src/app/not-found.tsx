import { PageMain } from "@/components/page-main";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { SiteHeader } from "@/features/game";

export default async function NotFound() {
  const t = await getTranslations("notFound");
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <PageMain className="py-7">
        <h1 className="text-[26px] leading-tight font-bold">{t("title")}</h1>
        <p className="text-santa-muted text-sm leading-relaxed">{t("text")}</p>
        <Link
          href="/"
          className="bg-santa-green text-santa-white flex h-14 items-center justify-center rounded-full px-[22px] text-base font-semibold"
        >
          {t("home")}
        </Link>
      </PageMain>
    </div>
  );
}
