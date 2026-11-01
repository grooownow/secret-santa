import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireAccount } from "@/features/auth";
import { getSettings, registrationOpen } from "@/features/game";
import {
  listParticipants,
  ProfileOverview,
  UnverifiedNotice,
} from "@/features/profile";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("profile.nav");
  return { title: t("profile") };
}

// «Анкета»: the participant cards of the account (moved out of «Главная»).
// Saving or deleting a participant comes back here.
export default async function ProfilePage() {
  const account = await requireAccount();
  if (!account.emailVerified) {
    return <UnverifiedNotice email={account.email} />;
  }
  const [settings, people] = await Promise.all([
    getSettings(),
    listParticipants(account.id),
  ]);
  return (
    <ProfileOverview
      people={people}
      building={account.building}
      apartment={account.apartment}
      registrationOpen={registrationOpen(new Date(), settings)}
    />
  );
}
