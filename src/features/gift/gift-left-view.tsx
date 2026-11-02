import { CircleCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { TextLink } from "@/components/form-ui";
import { recipientPath } from "@/lib/cabinet-routes";

/**
 * «Сюрприз на месте!» once the gift is marked: what was sent to the receiver,
 * read-only. The mark is final, so there is no edit button.
 */
export async function GiftLeftView({
  participantId,
  place,
  note,
}: {
  participantId: string;
  place: "locker" | "mailbox" | null;
  note: string | null;
}) {
  const t = await getTranslations("gift.form");
  return (
    <div className="flex flex-col gap-5">
      <div className="bg-santa-mint text-santa-green flex size-14 items-center justify-center rounded-full">
        <CircleCheck className="size-6" aria-hidden />
      </div>
      <h1 className="text-santa-ink text-[26px] leading-tight font-bold">
        {t("titleDone")}
      </h1>
      <p className="text-santa-muted text-sm leading-relaxed">
        {t("introDone")}
      </p>
      <dl className="border-santa-line flex flex-col gap-4 rounded-2xl border p-4">
        <div className="flex flex-col gap-1">
          <dt className="text-santa-green text-xs font-semibold">
            {t("place")}
          </dt>
          <dd className="text-santa-ink text-base">{place ? t(place) : "—"}</dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-santa-green text-xs font-semibold">
            {t("noteLabel")}
          </dt>
          <dd className="text-santa-ink text-base break-words whitespace-pre-line">
            {note || t("noNote")}
          </dd>
        </div>
      </dl>
      <TextLink href={recipientPath(participantId)}>{t("back")}</TextLink>
    </div>
  );
}
