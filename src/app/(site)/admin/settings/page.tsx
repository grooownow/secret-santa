import { getTranslations } from "next-intl/server";
import { PageTitle } from "@/features/account";
import { InviteQr, SettingsForm } from "@/features/admin";
import { getSettings } from "@/features/game";

// Dates and the invitation QR (frame wESwL).
export default async function AdminSettingsPage() {
  const [t, settings] = await Promise.all([
    getTranslations("admin.settings"),
    getSettings(),
  ]);
  return (
    <>
      <div className="flex flex-col gap-5 print:hidden">
        <PageTitle>{t("title")}</PageTitle>
        <SettingsForm
          values={{
            applicationsCloseOn: settings.applicationsCloseOn,
            drawOn: settings.drawOn,
            giftsStartOn: settings.giftsStartOn,
            giftsEndOn: settings.giftsEndOn,
            revealOn: settings.revealOn,
            closeOn: settings.closeOn,
          }}
        />
      </div>
      <InviteQr />
    </>
  );
}
