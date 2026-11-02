import { eq } from "drizzle-orm";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LinkButton } from "@/components/form-ui";
import { OrganizerLink } from "@/components/organizer-link";
import { getDb } from "@/db/client";
import { participants } from "@/db/schema";
import { DeleteAccountForm, PageText, PageTitle } from "@/features/account";
import { requireAccount } from "@/features/auth";
import { canExit, formatGameDay, getPhase, getSettings } from "@/features/game";
import { ExitRequestForm } from "@/features/profile";
import { ORGANIZER_NAME } from "@/lib/organizer";
import { CABINET_HOME, CABINET_SETTINGS } from "@/lib/cabinet-routes";
import { getLocale } from "next-intl/server";

function dayBefore(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

// Leaving the game. Collect: delete the account (frame r30NS). From the
// draw to 24 December: «Не могу участвовать», a request to the organizer.
// From 25 December nobody can leave (frame XqGGn explains).
export default async function LeavePage() {
  const account = await requireAccount();
  const [settings, locale, people] = await Promise.all([
    getSettings(),
    getLocale(),
    getDb()
      .select({
        id: participants.id,
        name: participants.name,
        kind: participants.kind,
        exitRequestedAt: participants.exitRequestedAt,
      })
      .from(participants)
      .where(eq(participants.userId, account.id))
      .orderBy(participants.createdAt),
  ]);

  if (getPhase(new Date(), settings) === "collect") {
    const t = await getTranslations("settings.delete");
    const names = new Intl.ListFormat(locale, {
      style: "long",
      type: "conjunction",
    }).format(people.map((p) => p.name));
    return (
      <>
        <TextBack label={t("back")} />
        <PageTitle>{t("title")}</PageTitle>
        <div className="bg-santa-danger-bg text-santa-danger flex flex-col gap-1 rounded-2xl p-4 text-sm leading-relaxed">
          <p className="text-base font-bold">{t("boxTitle")}</p>
          <p>{t("boxText")}</p>
        </div>
        {people.length > 0 ? (
          <PageText>{t("names", { names })}</PageText>
        ) : null}
        <LinkButton href={CABINET_HOME}>{t("stay")}</LinkButton>
        <DeleteAccountForm />
      </>
    );
  }

  // Between the draw and 24 December: «Не могу участвовать» is a request in
  // the app (the organizer gets an email and confirms), not a Telegram chat.
  if (account.emailVerified && canExit(new Date(), settings)) {
    const t = await getTranslations("settings.exit");
    const asked = people.filter((p) => p.exitRequestedAt);
    return (
      <>
        <TextBack label={t("back")} />
        <PageTitle>{t("title")}</PageTitle>
        <div className="bg-santa-mint flex flex-col gap-2 rounded-2xl p-[18px]">
          <p className="text-santa-green text-base font-bold">
            {t("boxTitle")}
          </p>
          <p className="text-santa-ink text-sm leading-relaxed">
            {t("boxText", {
              date: formatGameDay(dayBefore(settings.giftsStartOn), locale),
            })}
          </p>
        </div>
        {asked.map((p) => (
          <p
            key={p.id}
            className="bg-santa-yellow text-santa-ink rounded-2xl p-4 text-sm leading-relaxed"
          >
            {t("requested", { name: p.name })}
          </p>
        ))}
        <ExitRequestForm
          people={people.map((p) => ({
            id: p.id,
            name: p.name,
            kind: p.kind,
            requested: !!p.exitRequestedAt,
          }))}
        />
        <LinkButton href={CABINET_HOME}>{t("stay")}</LinkButton>
      </>
    );
  }

  const t = await getTranslations("settings.leave");
  return (
    <>
      <TextBack label={t("back")} />
      <PageTitle>{t("title")}</PageTitle>
      <div className="bg-santa-yellow flex flex-col gap-2 rounded-2xl p-[18px]">
        <p className="text-santa-ink text-base font-bold">{t("boxTitle")}</p>
        <p className="text-santa-ink text-sm leading-relaxed">
          {t("boxText", {
            date: formatGameDay(dayBefore(settings.giftsStartOn), locale),
          })}
        </p>
      </div>
      <PageText>{t("contact", { name: ORGANIZER_NAME })}</PageText>
      <OrganizerLink />
      <div className="flex flex-col gap-1">
        <p className="text-santa-ink text-[17px] font-bold">{t("dataTitle")}</p>
        <PageText>
          {t("dataText", {
            from: formatGameDay(settings.giftsStartOn, locale),
            until: formatGameDay(settings.closeOn, locale),
          })}
        </PageText>
      </div>
      <LinkButton href={CABINET_HOME}>{t("toCabinet")}</LinkButton>
    </>
  );
}

function TextBack({ label }: { label: string }) {
  return (
    <Link
      href={CABINET_SETTINGS}
      className="text-santa-green text-[13px] font-semibold"
    >
      ← {label}
    </Link>
  );
}
