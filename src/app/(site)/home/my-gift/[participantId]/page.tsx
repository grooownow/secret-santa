import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { requireVerifiedAccount } from "@/features/auth";
import { formatGameDay, getPhase, getSettings } from "@/features/game";
import {
  BeforeDraw,
  getMyGift,
  MyGiftCard,
  NotInDraw,
  participantIdSchema,
} from "@/features/gift";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("gift.mine");
  return { title: t("pageTitle") };
}

// «Мой подарок»: what waits for the participant. The giver is never shown.
export default async function MyGiftPage({
  params,
}: {
  params: Promise<{ participantId: string }>;
}) {
  const account = await requireVerifiedAccount();
  const id = participantIdSchema.safeParse((await params).participantId);
  if (!id.success) notFound();
  const gift = await getMyGift(account.id, id.data);
  if (!gift) notFound();

  const settings = await getSettings();
  if (gift.state === "notDrawn") {
    return <BeforeDraw drawOn={settings.drawOn} />;
  }
  if (gift.state === "notInDraw") return <NotInDraw />;
  const locale = await getLocale();
  return (
    <MyGiftCard
      personId={id.data}
      gift={gift}
      canReport={getPhase(new Date(), settings) !== "closed"}
      window={{
        start: formatGameDay(settings.giftsStartOn, locale),
        end: formatGameDay(settings.giftsEndOn, locale),
      }}
    />
  );
}
