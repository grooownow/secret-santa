import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireVerifiedAccount } from "@/features/auth";
import { getSettings, ParticipantSwitcher } from "@/features/game";
import { BeforeDraw } from "@/features/gift";
import { listParticipants } from "@/features/profile";
import { recipientPath } from "@/lib/cabinet-routes";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("profile.nav");
  return { title: t("gift") };
}

// The «Подарок» tab: a placeholder before the draw, afterwards the recipient
// of the account's participant (a switcher when there are several).
export default async function GiftTab({
  searchParams,
}: {
  searchParams: Promise<{ p?: string }>;
}) {
  const account = await requireVerifiedAccount();
  const [settings, people, query] = await Promise.all([
    getSettings(),
    listParticipants(account.id),
    searchParams,
  ]);
  const chosen =
    people.find((person) => person.id === query.p) ??
    (people.length === 1 ? people[0] : undefined);

  if (!settings.drawnAt || people.length === 0) {
    return <BeforeDraw drawOn={settings.drawOn} />;
  }
  if (chosen) redirect(recipientPath(chosen.id));
  return (
    <ParticipantSwitcher
      people={people}
      building={account.building}
      apartment={account.apartment}
      hrefFor={recipientPath}
    />
  );
}
