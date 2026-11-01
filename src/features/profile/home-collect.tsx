import { getLocale, getTranslations } from "next-intl/server";
import { LinkButton } from "@/components/form-ui";
import { PageText, PageTitle } from "@/features/account";
import type { GameSettings } from "@/features/game";
import type { Participant } from "./queries";
import { ParticipantCards } from "./participant-cards";
import { NEW_PARTICIPANT } from "./routes";

function formatDay(date: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

/**
 * The "Дом" page during the collect phase: profile statuses, draw date, add a
 * child, and a hint while the owner's profile is not filled in. Later phases
 * add their own sections next to this one in `/home`.
 */
export async function HomeCollect({
  people,
  settings,
  building,
  apartment,
  registrationOpen,
}: {
  people: Participant[];
  settings: GameSettings;
  building: string | null;
  apartment: string | null;
  registrationOpen: boolean;
}) {
  const [t, locale] = await Promise.all([
    getTranslations("profile.home"),
    getLocale(),
  ]);
  const owner = people.find((p) => p.kind === "adult");
  const drawDay = formatDay(settings.drawOn, locale);
  const closeDay = formatDay(settings.applicationsCloseOn, locale);

  return (
    <div className="flex flex-col gap-5">
      <span className="bg-santa-mint text-santa-green self-start rounded-full px-3 py-1 text-xs font-semibold">
        {t("phase", { date: closeDay })}
      </span>

      {owner ? (
        <PageTitle>{t("inGame", { name: owner.name })}</PageTitle>
      ) : (
        <PageTitle>{t("tellAboutYou")}</PageTitle>
      )}

      {owner ? (
        <PageText>{t("inGameText")}</PageText>
      ) : (
        <div className="bg-santa-yellow text-santa-ink flex flex-col gap-1 rounded-2xl p-4">
          <p className="text-base font-bold">{t("notReady")}</p>
          <p className="text-sm leading-relaxed">
            {t("notReadyText", { date: closeDay })}
          </p>
        </div>
      )}

      {owner ? (
        <div className="bg-santa-mint flex flex-col gap-1 rounded-2xl p-4">
          <p className="text-santa-green text-base font-bold">
            {t("drawOn", { date: drawDay })}
          </p>
          <p className="text-santa-muted text-sm leading-relaxed">
            {t("drawText")}
          </p>
        </div>
      ) : null}

      {owner ? (
        <ParticipantCards
          people={people}
          building={building}
          apartment={apartment}
          editable={registrationOpen}
        />
      ) : registrationOpen ? (
        <LinkButton href={NEW_PARTICIPANT}>{t("fillProfile")}</LinkButton>
      ) : null}

      {owner ? null : (
        <p className="text-santa-muted border-santa-line border-t pt-3 text-sm">
          {t("drawLine", { draw: drawDay })}
        </p>
      )}
    </div>
  );
}
