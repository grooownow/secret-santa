import { getTranslations } from "next-intl/server";
import { SiteFooter } from "@/features/game";
import { TextLink } from "@/components/form-ui";
import { signOutAction } from "./sign-out-action";
import { CABINET_SETTINGS_DELETE } from "@/lib/cabinet-routes";
import { PendingSpinner } from "@/components/spinner";
import { VolunteerToggle } from "./volunteer-toggle";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-santa-ink text-[17px] font-bold">{title}</h2>
      {children}
    </section>
  );
}

/**
 * Account settings (frame dyqXx): email, deleting the account (in
 * collect) or asking the organizer (after the draw), sign out, the rules
 * link and the shared author footer. There is no password change.
 */
export async function SettingsView({
  email,
  canDelete,
  volunteer,
}: {
  email: string;
  canDelete: boolean;
  /** «Могу быть запасным Сантой» is on for this account. */
  volunteer: boolean;
}) {
  const t = await getTranslations("settings");
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-santa-ink text-[26px] leading-tight font-bold">
        {t("title")}
      </h1>
      <Section title={t("email")}>
        <p className="text-santa-muted text-sm break-all">{email}</p>
      </Section>
      <Section title={t("dataTitle")}>
        <p className="text-santa-muted text-sm leading-relaxed">
          {canDelete ? t("dataCollect") : t("dataLater")}
        </p>
        {canDelete ? (
          <TextLink href={CABINET_SETTINGS_DELETE}>{t("deleteLink")}</TextLink>
        ) : (
          <TextLink href={CABINET_SETTINGS_DELETE}>{t("leaveLink")}</TextLink>
        )}
      </Section>
      <Section title={t("volunteerTitle")}>
        <VolunteerToggle initial={volunteer} />
      </Section>
      <form action={signOutAction}>
        <button
          type="submit"
          className="text-santa-danger flex items-center gap-1.5 text-[13px] font-semibold underline-offset-4 hover:underline"
        >
          {t("signOut")}
          <PendingSpinner className="size-3.5" />
        </button>
      </form>
      <TextLink href="/rules">{t("rulesLink")}</TextLink>
      <SiteFooter className="-mx-[26px] mt-2 -mb-8" />
    </div>
  );
}
