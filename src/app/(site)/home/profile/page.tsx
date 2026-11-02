import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireAccount } from "@/features/auth";
import { getSettings, registrationOpen } from "@/features/game";
import {
  getCurrentParticipant,
  listParticipants,
  ProfileOverview,
  switchParticipantAction,
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
  // After the draw each participant has their own recipient: show who plays
  // now and let the family switch right here.
  const current =
    settings.drawnAt && people.length > 1
      ? await getCurrentParticipant(account.id, people)
      : null;
  return (
    <ProfileOverview
      people={people}
      building={account.building}
      apartment={account.apartment}
      registrationOpen={registrationOpen(new Date(), settings)}
      active={
        current
          ? { currentId: current.id, action: switchParticipantAction }
          : undefined
      }
    />
  );
}
