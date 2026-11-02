import { Gift } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { LinkButton } from "@/components/form-ui";
import { OrganizerLink } from "@/components/organizer-link";
import { PageText, PageTitle } from "@/features/account";
import { CABINET_WALL } from "@/lib/cabinet-routes";
import { NotFoundForm } from "./not-found-form";
import type { MyGiftResult } from "./queries";

/**
 * «Мой подарок»: status, place and note of the gift that waits for the
 * participant, and «Не нашёл подарок» while it can still be reported.
 */
export async function MyGiftCard({
  personId,
  gift,
  canReport,
  window,
}: {
  personId: string;
  gift: Extract<MyGiftResult, { state: "ready" }>;
  canReport: boolean;
  window: { start: string; end: string };
}) {
  const [t, locale] = await Promise.all([
    getTranslations("gift.mine"),
    getLocale(),
  ]);
  const when = gift.leftAt
    ? new Intl.DateTimeFormat(locale, {
        day: "numeric",
        month: "long",
        timeZone: "Europe/Madrid",
      }).format(gift.leftAt)
    : "";

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-santa-mint text-santa-green flex size-14 items-center justify-center rounded-full">
        <Gift className="size-6" aria-hidden />
      </div>
      <PageTitle>{t(`${gift.status}.title`)}</PageTitle>
      <PageText>
        {t(`${gift.status}.text`, { start: window.start, end: window.end })}
      </PageText>

      {gift.status !== "waiting" ? (
        <dl className="bg-santa-mint flex flex-col gap-3 rounded-2xl p-4">
          <div className="flex flex-col gap-1">
            <dt className="text-santa-green text-xs font-semibold">
              {t("place")}
            </dt>
            <dd className="text-santa-ink text-base font-bold">
              {gift.place ? t(gift.place) : ""}
              {when ? (
                <span className="text-santa-muted text-sm font-normal">
                  {" "}
                  · {t("leftOn", { date: when })}
                </span>
              ) : null}
            </dd>
          </div>
          {gift.note ? (
            <div className="flex flex-col gap-1">
              <dt className="text-santa-green text-xs font-semibold">
                {t("note")}
              </dt>
              <dd className="text-santa-ink text-sm leading-relaxed whitespace-pre-line">
                {gift.note}
              </dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      {gift.status === "notFound" ? <OrganizerLink /> : null}

      {gift.status === "left" && canReport ? (
        <>
          <NotFoundForm participantId={personId} />
          <PageText>{t("notFoundHint")}</PageText>
        </>
      ) : null}

      {gift.status !== "waiting" ? (
        <LinkButton href={CABINET_WALL}>{t("wall")}</LinkButton>
      ) : null}
    </div>
  );
}
