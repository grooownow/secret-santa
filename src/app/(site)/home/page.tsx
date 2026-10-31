import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { PageText, PageTitle } from "@/features/account";
import { requireAccount } from "@/features/auth";
import {
  canGuess,
  canMarkGift,
  daysBetween,
  formatGameDay,
  getPhase,
  getSettings,
  HomeView,
  registrationOpen,
} from "@/features/game";
import { getMyGift, getRecipient, NotInDraw } from "@/features/gift";
import {
  CurrentSwitch,
  getCurrentParticipant,
  HomeCollect,
  listParticipants,
  UnverifiedNotice,
} from "@/features/profile";
import { OrganizerLink } from "@/components/organizer-link";
import { todayInMadrid } from "@/lib/game-time";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("profile.nav");
  return { title: t("home") };
}

// "Дом": one screen that changes with the phase. Collect is `HomeCollect`;
// the later phases are `HomeView`. The cabinet of the remembered participant
// (default: the account owner) is shown; «Сменить участника» opens the switcher.
export default async function Home() {
  const account = await requireAccount();
  if (!account.emailVerified) {
    return <UnverifiedNotice email={account.email} />;
  }

  const now = new Date();
  const [settings, people, locale] = await Promise.all([
    getSettings(),
    listParticipants(account.id),
    getLocale(),
  ]);
  const phase = getPhase(now, settings);

  if (phase === "closed") redirect("/closed");
  if (phase === "collect") {
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

  if (people.length === 0) {
    const t = await getTranslations("cabinet.home");
    return (
      <>
        <PageTitle>{t("noProfileTitle")}</PageTitle>
        <PageText>{t("noProfileText")}</PageText>
        <OrganizerLink />
      </>
    );
  }

  const chosen = await getCurrentParticipant(account.id, people);
  if (!chosen) return null;

  const [recipient, myGift] = await Promise.all([
    getRecipient(account.id, chosen.id),
    getMyGift(account.id, chosen.id),
  ]);
  const switcher = (
    <CurrentSwitch userId={account.id} personId={chosen.id} to="home" />
  );
  if (recipient?.state === "notInDraw") {
    return (
      <>
        {switcher}
        <NotInDraw />
      </>
    );
  }
  return (
    <>
      {switcher}
      <HomeView
        phase={phase}
        person={{ id: chosen.id, name: chosen.name }}
        recipient={
          recipient?.state === "ready"
            ? {
                state: "ready",
                name: recipient.recipient.name,
                building: recipient.recipient.building,
                apartment: recipient.recipient.apartment,
                reassigned: recipient.reassigned,
                giftLeft: recipient.gift.leftAt !== null,
              }
            : { state: "none" }
        }
        myGift={myGift?.state === "ready" ? myGift.status : "waiting"}
        daysToGifts={daysBetween(todayInMadrid(now), settings.giftsStartOn)}
        canMark={canMarkGift(now, settings)}
        canGuess={canGuess(now, settings)}
        dates={{
          giftsStart: formatGameDay(settings.giftsStartOn, locale),
          giftsEnd: formatGameDay(settings.giftsEndOn, locale),
        }}
      />
    </>
  );
}
