import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireVerifiedAccount } from "@/features/auth";
import { ParticipantSwitcher } from "@/features/game";
import { listParticipants } from "@/features/profile";
import { switchToPath } from "@/lib/cabinet-routes";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("cabinet.switcher");
  return { title: t("title") };
}

// Frame eIsHY: pick whose cabinet to open. `?to=gift` leads to the gift tab.
export default async function SwitchPage({
  searchParams,
}: {
  searchParams: Promise<{ to?: string }>;
}) {
  const account = await requireVerifiedAccount();
  const [people, query] = await Promise.all([
    listParticipants(account.id),
    searchParams,
  ]);
  const to = query.to === "gift" ? "gift" : "home";
  return (
    <ParticipantSwitcher
      people={people}
      building={account.building}
      apartment={account.apartment}
      hrefFor={(id) => switchToPath(id, to)}
    />
  );
}
