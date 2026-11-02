import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireVerifiedAccount } from "@/features/auth";
import { ParticipantSwitcher } from "@/features/game";
import {
  getCurrentParticipant,
  listParticipants,
  switchParticipantAction,
} from "@/features/profile";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("cabinet.switcher");
  return { title: t("title") };
}

// Frame eIsHY: pick whose cabinet to open. `?to=gift` / `?to=profile` return
// to that tab after the choice.
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
  const current = await getCurrentParticipant(account.id, people);
  const to =
    query.to === "gift" ? "gift" : query.to === "profile" ? "profile" : "home";
  return (
    <ParticipantSwitcher
      people={people}
      currentId={current?.id ?? null}
      building={account.building}
      apartment={account.apartment}
      action={switchParticipantAction}
      to={to}
    />
  );
}
