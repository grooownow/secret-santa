import { getLocale, getTranslations } from "next-intl/server";
import { LinkButton } from "@/components/form-ui";
import { ResendDrawForm, RunDrawForm } from "@/features/draw";
import type { GameSettings } from "@/features/game";
import { todayInMadrid } from "@/lib/game-time";
import type { Overview } from "./queries";
import { ADMIN_BACKUP, ADMIN_PARTICIPANTS } from "./routes";

function daysBetween(from: string, to: string): number {
  const ms = Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`);
  return Math.max(0, Math.round(ms / 86_400_000));
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-santa-mint flex flex-1 flex-col gap-1 rounded-2xl p-4">
      <span className="text-santa-muted text-xs">{label}</span>
      <span className="text-santa-ink text-[28px] leading-none font-bold">
        {value}
      </span>
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
    return (
      <div className="flex flex-col gap-5">
        <h1 className="text-santa-ink text-[26px] leading-tight font-bold">
          {t("collectTitle")}
        </h1>
        <div className="flex gap-3">
          <Stat label={t("participants")} value={overview.participants} />
          <Stat label={t("unverifiedLabel")} value={overview.excluded} />
        </div>
        {overview.excluded > 0 ? (
          <p className="text-santa-muted text-sm leading-relaxed">
            {t("unverified", { count: overview.excluded })}
          </p>
        ) : null}
        <LinkButton href={ADMIN_PARTICIPANTS}>{t("check")}</LinkButton>
        <RunDrawForm />
      </div>
    );
  }

  const giftsOn = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${settings.giftsStartOn}T12:00:00Z`));
  const days = daysBetween(todayInMadrid(new Date()), settings.giftsStartOn);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-santa-ink text-[26px] leading-tight font-bold">
        {t("drawnTitle")}
      </h1>
      <div className="flex gap-3">
        <Stat label={t("inChain")} value={overview.participants} />
        {overview.phase === "waiting" ? (
          <Stat label={t("daysTo", { date: giftsOn })} value={days} />
        ) : (
          <Stat label={t("giftsMarked")} value={overview.giftsMarked} />
        )}
      </div>
      <BroadcastStatus
        label={t("drawMail")}
        status={overview.broadcast}
        resend={<ResendDrawForm />}
      />
      <LinkButton href={ADMIN_PARTICIPANTS}>{t("participantsLink")}</LinkButton>
      <LinkButton href={ADMIN_BACKUP}>{t("backupLink")}</LinkButton>
    </div>
  );
}
