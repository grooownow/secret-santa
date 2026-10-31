import { CircleCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { LinkButton } from "@/components/form-ui";
import { PageText, PageTitle } from "@/features/account";
import { myGiftPath } from "@/lib/cabinet-routes";

/** Frame roA55: the recipient dropped out and there is nobody to give to. */
export async function NothingToGive({ personId }: { personId: string }) {
  const t = await getTranslations("gift.nothing");
  return (
    <div className="flex flex-col gap-5">
      <div className="bg-santa-mint text-santa-green flex size-14 items-center justify-center rounded-full">
        <CircleCheck className="size-6" aria-hidden />
      </div>
      <PageTitle>{t("title")}</PageTitle>
      <PageText>{t("text")}</PageText>
      <div className="bg-santa-mint flex flex-col gap-1 rounded-2xl p-4">
        <p className="text-santa-green text-base font-bold">{t("boxTitle")}</p>
        <p className="text-santa-muted text-sm leading-relaxed">
          {t("boxText")}
        </p>
      </div>
      <LinkButton href={myGiftPath(personId)}>{t("myGift")}</LinkButton>
    </div>
  );
}
