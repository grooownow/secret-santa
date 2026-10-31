import { Gift } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { PageText, PageTitle } from "@/features/account";
import { formatGameDay } from "@/features/game";

/** Placeholder of the «Подарок» tab before the draw (spec 5, menu). */
export async function BeforeDraw({ drawOn }: { drawOn: string }) {
  const [t, locale] = await Promise.all([
    getTranslations("gift.beforeDraw"),
    getLocale(),
  ]);
  return (
    <div className="flex flex-col gap-5">
      <div className="bg-santa-mint text-santa-green flex size-14 items-center justify-center rounded-full">
        <Gift className="size-6" aria-hidden />
      </div>
      <PageTitle>
        {t("title", { date: formatGameDay(drawOn, locale) })}
      </PageTitle>
      <PageText>{t("text")}</PageText>
    </div>
  );
}
