import { getTranslations } from "next-intl/server";
import { PageText, PageTitle } from "@/features/account";
import {
  listParticipantRows,
  ParticipantsTable,
  type TablePhase,
} from "@/features/admin";
import { canExit, getPhase, getSettings } from "@/features/game";

// Participants table: remove an application in collect, withdraw from the
// draw to 24 December, view only later.
export default async function AdminParticipantsPage() {
  const [t, rows, settings] = await Promise.all([
    getTranslations("admin.participants"),
    listParticipantRows(),
    getSettings(),
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
      <PageText>{t(`intro.${phase}`, { count: rows.length })}</PageText>
      <ParticipantsTable rows={rows} phase={phase} />
    </>
  );
}
