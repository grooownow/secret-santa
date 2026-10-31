import { getLocale, getTranslations } from "next-intl/server";
import { LinkButton, TextLink } from "@/components/form-ui";
import { RunDrawForm } from "@/features/draw";
import type { GameSettings } from "@/features/game";
import type { BroadcastEvent } from "@/features/mail";
import { daysBetween, formatGameDay, todayInMadrid } from "@/lib/game-time";
import type { Overview } from "./queries";
import { ResendBroadcastForm } from "./resend-broadcast-form";
import { canResend } from "./resend-rules";
import { ADMIN_BACKUP, ADMIN_PARTICIPANTS } from "./routes";

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col gap-1">
      <span className="text-santa-ink text-[40px] leading-none font-bold">
        {value}
      </span>
      <span className="text-santa-muted text-xs">{label}</span>
    </div>
  );
}

/** Mint card with the stage name (frame ThhEp, "Сбор заявок"). */
function StageCard({ title, text }: { title: string; text?: string }) {
  return (
    <div className="bg-santa-mint flex flex-col gap-[7px] rounded-xl p-[18px]">
      <p className="text-santa-ink text-[17px] font-bold">{title}</p>
      {text ? <p className="text-santa-muted text-[13px]">{text}</p> : null}
    </div>
  );
}

/** Status line of one mailing: "sent N of M" and "Дослать" while unfinished. */
export async function BroadcastStatus({
  label,
  status,
  resend,
}: {
  label: string;
  status: { total: number; sent: number };
  resend?: React.ReactNode;
}) {
  const t = await getTranslations("admin.overview");
  const done = status.sent >= status.total;
  return (
    <div className="border-santa-line flex flex-col gap-3 rounded-2xl border p-4">
      <p className="text-santa-ink text-sm font-semibold">{label}</p>
      <p className="text-santa-muted text-sm">
        {t("sentOf", { sent: status.sent, total: status.total })}
      </p>
      {done ? null : resend}
    </div>
  );
}

/**
 * Overview of the organizer's start page. Collect and the waiting phase are
 * built; later phases add their own blocks next to these.
 */
export async function OverviewView({
  overview,
  settings,
}: {
  overview: Overview;
  settings: GameSettings;
}) {
  const [t, locale] = await Promise.all([
    getTranslations("admin.overview"),
    getLocale(),
  ]);

  if (overview.phase === "collect") {
    const closeOn = new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(`${settings.applicationsCloseOn}T12:00:00Z`));
    return (
      <div className="flex flex-col gap-5">
        <StageCard
          title={t("collectTitle")}
          text={t("collectUntil", { date: closeOn })}
        />
        <div className="flex gap-5">
          <Stat label={t("participants")} value={overview.participants} />
          <Stat label={t("unverifiedLabel")} value={overview.excluded} />
        </div>
        <div className="border-santa-line flex flex-col gap-2 border-b pb-[18px]">
          <p className="text-santa-ink text-[17px] font-bold">
            {t("beforeTitle")}
          </p>
          <p className="text-santa-muted text-sm leading-relaxed">
            {t("beforeText")}
            {overview.excluded > 0
              ? ` ${t("unverified", { count: overview.excluded })}`
              : ""}
          </p>
        </div>
        <TextLink href={ADMIN_PARTICIPANTS}>{t("check")} →</TextLink>
        <RunDrawForm
          ready={overview.participants}
          excluded={overview.excluded}
          checkHref={ADMIN_PARTICIPANTS}
        />
      </div>
    );
  }

  const giftsOn = formatGameDay(settings.giftsStartOn, locale);
  const days = daysBetween(todayInMadrid(new Date()), settings.giftsStartOn);

  const mailing = (event: BroadcastEvent, label: string) => (
    <BroadcastStatus
      key={event}
      label={label}
      status={overview.broadcasts[event]}
      resend={
        canResend(event, overview.phase) ? (
          <ResendBroadcastForm event={event} />
        ) : undefined
      }
    />
  );

  if (overview.phase === "waiting") {
    return (
      <div className="flex flex-col gap-5">
        <StageCard title={t("drawnTitle")} />
        <div className="flex gap-5">
          <Stat label={t("inChain")} value={overview.participants} />
          <Stat label={t("daysTo", { date: giftsOn })} value={days} />
        </div>
        {mailing("draw", t("drawMail"))}
        <LinkButton href={ADMIN_PARTICIPANTS}>
          {t("participantsLink")}
        </LinkButton>
        <LinkButton href={ADMIN_BACKUP}>{t("backupLink")}</LinkButton>
      </div>
    );
  }

  const helpBox =
    overview.backupNeeded > 0 ? (
      <div className="bg-santa-yellow flex flex-col gap-2 rounded-2xl p-[18px]">
        <p className="text-santa-ink text-base font-bold">{t("helpTitle")}</p>
        <p className="text-santa-ink text-sm leading-relaxed">
          {t("helpText", { count: overview.backupNeeded })}
        </p>
      </div>
    ) : null;

  if (overview.phase === "gifts") {
    return (
      <div className="flex flex-col gap-5">
        <StageCard title={t("giftsTitle")} />
        <div className="flex gap-5">
          <Stat label={t("inChain")} value={overview.participants} />
          <Stat label={t("giftsMarked")} value={overview.giftsMarked} />
        </div>
        {helpBox}
        <Stat label={t("waitingBackup")} value={overview.backupNeeded} />
        {mailing("gifts-open", t("giftsOpenMail"))}
        {mailing("reminder", t("reminderMail"))}
        <LinkButton href={ADMIN_BACKUP}>{t("backupLink")}</LinkButton>
        <LinkButton href={ADMIN_PARTICIPANTS}>
          {t("participantsLink")}
        </LinkButton>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <StageCard title={t("revealTitle")} />
      <div className="flex gap-5">
        <Stat label={t("giftsMarked")} value={overview.giftsMarked} />
        <Stat label={t("backupNeeded")} value={overview.backupNeeded} />
        <Stat label={t("backupOrganized")} value={overview.backupOrganized} />
      </div>
      {helpBox}
      {mailing("reveal", t("revealMail"))}
      {mailing("reminder", t("reminderMail"))}
      <p className="text-santa-muted text-sm leading-relaxed">
        {t("purgeNote", { date: formatGameDay(settings.closeOn, locale) })}
      </p>
      <LinkButton href={ADMIN_BACKUP}>{t("backupLink")}</LinkButton>
    </div>
  );
}
