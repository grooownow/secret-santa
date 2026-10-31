import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireAccount } from "@/features/auth";
import { getPhase, getSettings, registrationOpen } from "@/features/game";
import {
  HomeCollect,
  listParticipants,
  UnverifiedNotice,
} from "@/features/profile";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("profile.nav");
  return { title: t("home") };
}

// "Дом": one screen that changes with the phase. This task builds the collect
// phase; the next ones add the other phases as further branches.
export default async function Home() {
  const account = await requireAccount();
  if (!account.emailVerified) {
    return <UnverifiedNotice email={account.email} />;
  }

  const now = new Date();
  const [settings, people] = await Promise.all([
    getSettings(),
    listParticipants(account.id),
  ]);

  if (getPhase(now, settings) === "collect") {
    return (
      <HomeCollect
        people={people}
        settings={settings}
        building={account.building}
        apartment={account.apartment}
        registrationOpen={registrationOpen(now, settings)}
      />
    );
  }
  return null;
}
