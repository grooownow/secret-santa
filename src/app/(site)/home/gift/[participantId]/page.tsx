import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireVerifiedAccount } from "@/features/auth";
import { canMarkGift, getSettings } from "@/features/game";
import {
  BeforeDraw,
  getRecipient,
  GiftForm,
  NothingToGive,
  participantIdSchema,
} from "@/features/gift";
import { recipientPath } from "@/lib/cabinet-routes";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("gift.form");
  return { title: t("title") };
}

// «Оставить подарок»: the giver marks or corrects the place. Outside
// 25-31 December the form is not offered; the recipient card explains why.
export default async function LeaveGiftPage({
  params,
}: {
  params: Promise<{ participantId: string }>;
}) {
  const account = await requireVerifiedAccount();
  const id = participantIdSchema.safeParse((await params).participantId);
  if (!id.success) notFound();
  const result = await getRecipient(account.id, id.data);
  if (!result) notFound();

  const settings = await getSettings();
  if (result.state === "notDrawn") {
    return <BeforeDraw drawOn={settings.drawOn} />;
  }
  if (result.state === "none") return <NothingToGive personId={id.data} />;
  if (!canMarkGift(new Date(), settings)) redirect(recipientPath(id.data));

  const { gift, recipient } = result;
  return (
    <GiftForm
      participantId={id.data}
      name={recipient.name}
      marked={gift.leftAt !== null}
      defaults={{
        place: gift.place ?? "",
        code: gift.code ?? "",
        note: gift.note ?? "",
      }}
    />
  );
}
