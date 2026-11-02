import { Gift } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { TextLink } from "@/components/form-ui";
import { myGiftPath } from "@/lib/cabinet-routes";
import type { GiftStatus } from "./queries";

/**
 * «Подарок для тебя» — what the playing participant receives, on «Главная»
 * and «Профиль». Before the gifts start it only says when they start; then a
 * green box «Вася, тебя ждёт подарок!» with the place and note once it is
 * left, or a plain line that the Santa has not left it yet. Never names the
 * giver.
 */
export async function ForYouBox({
  personId,
  name,
  started,
  startDate,
  gift,
}: {
  personId: string;
  name: string;
  /** The gifts window has opened (25 December by default). */
  started: boolean;
  /** Formatted start day, e.g. «25 декабря». */
  startDate: string;
  gift: {
    status: GiftStatus;
    place: "locker" | "mailbox" | null;
    note: string | null;
  } | null;
}) {
  const t = await getTranslations("gift.forYou");

  if (!started || !gift) {
    return (
      <section data-for-you="soon" className="flex flex-col gap-1">
        <h2 className="text-santa-ink text-base font-bold">{t("title")}</h2>
        <p className="text-santa-muted text-sm leading-relaxed">
          {t("soon", { date: startDate })}
        </p>
      </section>
    );
  }

  if (gift.status === "left") {
    return (
      <section
        data-for-you="left"
        className="bg-santa-lime text-santa-ink flex flex-col gap-2 rounded-2xl p-4"
      >
        <p className="flex items-center gap-2 text-lg font-bold">
          <Gift className="text-santa-green size-5 shrink-0" aria-hidden />
          {t("leftTitle", { name })}
        </p>
        <p className="text-sm leading-relaxed">
          {gift.place ? t(`leftPlace.${gift.place}`) : t("leftPlaceUnknown")}
        </p>
        {gift.note ? (
          <p className="text-sm leading-relaxed break-words">
            {t("note", { note: gift.note })}
          </p>
        ) : null}
        <TextLink href={myGiftPath(personId)}>{t("details")}</TextLink>
      </section>
    );
  }

  return (
    <section data-for-you={gift.status} className="flex flex-col gap-1">
      <h2 className="text-santa-ink text-base font-bold">
        {gift.status === "notFound" ? t("notFoundTitle") : t("waitingTitle")}
      </h2>
      <p className="text-santa-muted text-sm leading-relaxed">
        {gift.status === "notFound" ? t("notFoundText") : t("waitingText")}
      </p>
    </section>
  );
}
