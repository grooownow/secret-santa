import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { PageText, PageTitle } from "@/features/account";
import { requireAccount } from "@/features/auth";
import {
  canMarkGift,
  daysBetween,
  formatGameDay,
  getPhase,
  getSettings,
  HomeView,
  registrationOpen,
  type GameSettings,
} from "@/features/game";
import { AboutSections, SantaIllustration } from "@/features/landing";
import { ForYouBox, getMyGift, getRecipient, NotInDraw } from "@/features/gift";
import {
  CurrentSwitch,
  getCurrentParticipant,
  HomeCollect,
  listParticipants,
  UnverifiedNotice,
} from "@/features/profile";
import { OrganizerLink } from "@/components/organizer-link";
import { todayInMadrid } from "@/lib/game-time";

type Account = Awaited<ReturnType<typeof requireAccount>>;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("profile.nav");
  return { title: t("home") };
}

// «Главная»: the status card of the current phase on top (collect is
// `HomeCollect`, later phases `HomeView`, for the remembered participant;
// «Сменить участника» opens the switcher), then the explaining part of the
// public landing (`CabinetAbout`). The participant cards are on «Анкета».
export default async function Home() {
  const account = await requireAccount();
  if (!account.emailVerified) {
    return <UnverifiedNotice email={account.email} />;
  }
  const [settings, locale] = await Promise.all([getSettings(), getLocale()]);
  return (
    <>
      <HomeStatus account={account} settings={settings} locale={locale} />
      <CabinetAbout settings={settings} locale={locale} />
    </>
  );
}

/** Santa illustration and the landing's «what / how / dates / FAQ». */
function CabinetAbout({
  settings,
  locale,
}: {
  settings: GameSettings;
  locale: string;
}) {
  return (
    <div className="-mx-[26px] -mb-8 flex flex-col">
      <div className="border-santa-line mt-4 flex justify-center border-t pt-6">
        <SantaIllustration />
      </div>
      <AboutSections settings={settings} locale={locale} />
    </div>
  );
}

async function HomeStatus({
  account,
  settings,
  locale,
}: {
  account: Account;
  settings: GameSettings;
  locale: string;
}) {
  const now = new Date();
  const people = await listParticipants(account.id);
  const phase = getPhase(now, settings);

  if (phase === "closed") redirect("/closed");
  if (phase === "collect") {
    return (
      <HomeCollect
        people={people}
        settings={settings}
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
        forYou={
          <ForYouBox
            personId={chosen.id}
            name={chosen.name}
            started={canMarkGift(now, settings) || phase !== "waiting"}
            startDate={formatGameDay(settings.giftsStartOn, locale)}
            gift={myGift?.state === "ready" ? myGift : null}
          />
        }
        daysToGifts={daysBetween(todayInMadrid(now), settings.giftsStartOn)}
        dates={{
          giftsStart: formatGameDay(settings.giftsStartOn, locale),
          giftsEnd: formatGameDay(settings.giftsEndOn, locale),
        }}
      />
    </>
  );
}
