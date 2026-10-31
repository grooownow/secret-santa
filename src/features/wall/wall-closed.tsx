import { Heart } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { PageText, PageTitle } from "@/features/account";
import { formatGameDay } from "@/features/game";

/** Placeholder before 25 December: «Стена откроется 25 декабря». */
export async function WallClosed({ opensOn }: { opensOn: string }) {
  const [t, locale] = await Promise.all([
    getTranslations("wall.closed"),
    getLocale(),
  ]);
  return (
    <div className="flex flex-col gap-5">
      <div className="bg-santa-mint text-santa-green flex size-14 items-center justify-center rounded-full">
        <Heart className="size-6" aria-hidden />
      </div>
      <PageTitle>
        {t("title", { date: formatGameDay(opensOn, locale) })}
      </PageTitle>
      <PageText>{t("text")}</PageText>
    </div>
  );
}
