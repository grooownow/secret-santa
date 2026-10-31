import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireVerifiedAccount } from "@/features/auth";
import { getSettings } from "@/features/game";
import { BeforeDraw } from "@/features/gift";
import { getCurrentParticipant } from "@/features/profile";
import { recipientPath } from "@/lib/cabinet-routes";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("profile.nav");
  return { title: t("gift") };
}

// The «Подарок» tab: a placeholder before the draw, afterwards the recipient
// card of the current participant (the account owner by default).
export default async function GiftTab() {
  const account = await requireVerifiedAccount();
  const settings = await getSettings();
  const current = await getCurrentParticipant(account.id);
  if (!settings.drawnAt || !current) {
    return <BeforeDraw drawOn={settings.drawOn} />;
  }
  redirect(recipientPath(current.id));
}
