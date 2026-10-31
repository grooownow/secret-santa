import { getTranslations } from "next-intl/server";
import { PageText, PageTitle } from "@/features/account";
import {
  BackupList,
  listBackupNeeded,
  listBackupOrganized,
} from "@/features/admin";

// "Нужен запасной Санта" (frame w6MjaY).
export default async function AdminBackupPage() {
  const [t, needed, organized] = await Promise.all([
    getTranslations("admin.backup"),
    listBackupNeeded(),
    listBackupOrganized(),
  ]);
  return (
    <>
      <PageTitle>{t("title")}</PageTitle>
      <PageText>{t("intro")}</PageText>
      <BackupList needed={needed} organized={organized} />
    </>
  );
}
