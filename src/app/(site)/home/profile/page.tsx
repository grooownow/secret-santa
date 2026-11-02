import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { requireAccount } from "@/features/auth";
import {
  canGuess,
  formatGameDay,
  getPhase,
  getSettings,
  registrationOpen,
} from "@/features/game";
import { ForYouBox, getMyGift } from "@/features/gift";
import {
  getCurrentParticipant,
  listParticipants,
  ProfileOverview,
  switchParticipantAction,
  UnverifiedNotice,
} from "@/features/profile";
import { GuessBlock, listGuessOptions } from "@/features/reveal";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("profile.nav");
  return { title: t("profile") };
}

// «Профиль»: everything about what this participant receives — the account's
// participant cards, and after the draw «Подарок для тебя» and «А кто твой
// Санта?» for the one playing now. Saving or deleting a participant comes
// back here.
export default async function ProfilePage() {
  const account = await requireAccount();
  if (!account.emailVerified) {
    return <UnverifiedNotice email={account.email} />;
  }
  const [settings, people, locale] = await Promise.all([
    getSettings(),
    listParticipants(account.id),
    getLocale(),
  ]);
  const now = new Date();
  const current = settings.drawnAt
    ? await getCurrentParticipant(account.id, people)
    : null;
  const guessOpen = canGuess(now, settings);
  const [gift, guess] = current
    ? await Promise.all([
        getMyGift(account.id, current.id),
        guessOpen ? listGuessOptions(account.id, current.id) : null,
      ])
    : [null, null];
  const inGame = gift?.state === "ready";
  const dates = {
    giftsStart: formatGameDay(settings.giftsStartOn, locale),
    giftsEnd: formatGameDay(settings.giftsEndOn, locale),
  };
  const phase = getPhase(now, settings);

  return (
    <>
      <ProfileOverview
        people={people}
        building={account.building}
        apartment={account.apartment}
        registrationOpen={registrationOpen(now, settings)}
        active={
          current && people.length > 1
            ? { currentId: current.id, action: switchParticipantAction }
            : undefined
        }
      />
      {current && inGame ? (
        <div className="border-santa-line flex flex-col gap-5 border-t pt-5">
          <ForYouBox
            personId={current.id}
            name={current.name}
            started={phase !== "waiting"}
            startDate={dates.giftsStart}
            gift={gift}
          />
          {/* After the reveal the guess is answered on the reveal page. */}
          {phase === "reveal" ? null : (
            <GuessBlock
              personId={current.id}
              open={guessOpen}
              guessedName={
                guess?.state === "ready"
                  ? (guess.options.find((o) => o.id === guess.guessedId)
                      ?.name ?? null)
                  : null
              }
              dates={dates}
            />
          )}
        </div>
      ) : null}
    </>
  );
}
