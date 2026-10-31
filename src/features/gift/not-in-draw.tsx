import { CircleAlert } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { OrganizerLink } from "@/components/organizer-link";
import { PageText, PageTitle } from "@/features/account";

/** The participant joined after the draw: no recipient and no Santa. */
export async function NotInDraw() {
  const t = await getTranslations("gift.notInDraw");
  return (
    <div className="flex flex-col gap-5">
      <div className="bg-santa-mint text-santa-green flex size-14 items-center justify-center rounded-full">
        <CircleAlert className="size-6" aria-hidden />
      </div>
      <PageTitle>{t("title")}</PageTitle>
      <PageText>{t("text")}</PageText>
      <OrganizerLink />
    </div>
  );
}
