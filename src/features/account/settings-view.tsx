import { getTranslations } from "next-intl/server";
import { OrganizerLink } from "@/components/organizer-link";
import { TextLink } from "@/components/form-ui";
import { signOutAction } from "./sign-out-action";
import { LanguageForm } from "@/features/game";
import { CABINET_SETTINGS_DELETE } from "@/lib/cabinet-routes";

const DEVELOPER_URL = "https://ludvik4.dev";
const TELEGRAM_URL = "https://t.me/ludvik4";
const THREADS_URL = "https://www.threads.com/@ludvik.coffee";

const externalClass =
  "text-santa-green text-[13px] font-semibold underline-offset-4 hover:underline";

function External({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={externalClass}
    >
      {children}
    </a>
  );
}

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
 * Account settings (frame dyqXx): email, language, deleting the account (in
 * collect) or asking the organizer (after the draw), sign out and the
 * developer block. There is no password change.
 */
export async function SettingsView({
  email,
  canDelete,
}: {
  email: string;
  canDelete: boolean;
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
      <Section title={t("language")}>
        <LanguageForm variant="select" />
      </Section>
      <Section title={t("dataTitle")}>
        <p className="text-santa-muted text-sm leading-relaxed">
          {canDelete ? t("dataCollect") : t("dataLater")}
        </p>
        {canDelete ? (
          <TextLink href={CABINET_SETTINGS_DELETE}>{t("delete")}</TextLink>
        ) : (
          <>
            <TextLink href={CABINET_SETTINGS_DELETE}>{t("leave")}</TextLink>
            <OrganizerLink />
          </>
        )}
      </Section>
      <form action={signOutAction}>
        <button
          type="submit"
          className="text-santa-danger text-[13px] font-semibold underline-offset-4 hover:underline"
        >
          {t("signOut")}
        </button>
      </form>
      <Section title={t("author.title")}>
        <p className="text-santa-ink text-sm">
          {t("author.madeBy")} —{" "}
          <External href={DEVELOPER_URL}>ludvik4.dev</External>
        </p>
        <p className="text-santa-ink text-sm">
          {t("author.contact")} —{" "}
          <External href={TELEGRAM_URL}>Telegram</External>
        </p>
        <p className="text-santa-ink text-sm">
          {t("author.social")} — <External href={THREADS_URL}>Threads</External>
        </p>
        <External href={DEVELOPER_URL}>{t("author.order")}</External>
      </Section>
    </div>
  );
}
