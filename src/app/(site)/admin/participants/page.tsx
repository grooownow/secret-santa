import { getLocale, getTranslations } from "next-intl/server";
import { PageText, PageTitle } from "@/features/account";
import {
  listParticipantRows,
  ParticipantsTable,
  type TablePhase,
} from "@/features/admin";
import { addDays, canExit, getPhase, getSettings } from "@/features/game";
import { formatGameDay } from "@/lib/game-time";

// Participants table: remove an application in collect, withdraw from the
// draw to the day before the gifts start, view only later.
export default async function AdminParticipantsPage() {
  const [t, rows, settings, locale] = await Promise.all([
    getTranslations("admin.participants"),
    listParticipantRows(),
    getSettings(),
    getLocale(),
  ]);
  const now = new Date();
  const phase: TablePhase =
    getPhase(now, settings) === "collect"
      ? "collect"
      : canExit(now, settings)
        ? "waiting"
        : "later";
  return (
    <>
      <PageTitle>{t("title")}</PageTitle>
      <PageText>
        {t(`intro.${phase}`, {
          count: rows.length,
          lastExit: formatGameDay(addDays(settings.giftsStartOn, -1), locale),
          giftsStart: formatGameDay(settings.giftsStartOn, locale),
        })}
      </PageText>
      <ParticipantsTable rows={rows} phase={phase} />
    </>
  );
}
