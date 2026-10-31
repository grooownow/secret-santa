import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { CurrentSwitch } from "@/features/profile";
import { requireVerifiedAccount } from "@/features/auth";
import { canMarkGift, formatGameDay, getSettings } from "@/features/game";
import {
  BeforeDraw,
  getRecipient,
  NothingToGive,
  NotInDraw,
  participantIdSchema,
  RecipientCard,
} from "@/features/gift";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("profile.nav");
  return { title: t("gift") };
}

// The recipient's address and photo are read only for the current giver:
// another account's id, a malformed one, or a former giver gets a plain 404.
export default async function RecipientPage({
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
  if (result.state === "notInDraw") return <NotInDraw />;
  const switcher = (
    <CurrentSwitch userId={account.id} personId={id.data} to="gift" />
  );
  if (result.state === "none") {
    return (
      <>
        {switcher}
        <NothingToGive personId={id.data} />
      </>
    );
  }

  const locale = await getLocale();
  return (
    <>
      {switcher}
      <RecipientCard
        personId={id.data}
        recipient={result.recipient}
        reassigned={result.reassigned}
        giftLeft={result.gift.leftAt !== null}
        canMark={canMarkGift(new Date(), settings)}
        window={{
          start: formatGameDay(settings.giftsStartOn, locale),
          end: formatGameDay(settings.giftsEndOn, locale),
        }}
      />
    </>
  );
}
