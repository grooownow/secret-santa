import { ChevronLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
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
      {/* Back to the recipient's page, top left like any sub-page. */}
      <Link
        href={recipientPath(participantId)}
        aria-label={t("back")}
        className="text-santa-green bg-santa-mint -ml-1 flex size-10 items-center justify-center rounded-full"
      >
        <ChevronLeft className="size-6" aria-hidden />
      </Link>
      {/* The landing's Santa, waving: the gift is done. */}
      <Image
        src="/email/santa.png"
        alt=""
        width={140}
        height={140}
        className="size-[140px] self-center object-contain"
      />
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
    </div>
  );
}
