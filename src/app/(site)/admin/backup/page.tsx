import { getTranslations } from "next-intl/server";
import { PageText, PageTitle } from "@/features/account";
import {
  BackupList,
  listBackupNeeded,
  listBackupOrganized,
  eligibleVolunteers,
  listVolunteers,
} from "@/features/admin";

// "Нужен запасной Санта" (frame w6MjaY).
export default async function AdminBackupPage() {
  const [t, needed, organized, volunteers] = await Promise.all([
    getTranslations("admin.backup"),
    listBackupNeeded(),
    listBackupOrganized(),
    listVolunteers(),
  ]);
  return (
    <>
      <PageTitle>{t("title")}</PageTitle>
      <PageText>{t("intro")}</PageText>
      <BackupList
        needed={needed}
        organized={organized}
        volunteers={volunteers}
        options={Object.fromEntries(
          needed.map((e) => [
            e.participantId,
            eligibleVolunteers(e, volunteers),
          ]),
        )}
      />
    </>
  );
}
