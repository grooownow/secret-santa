import { getLocale, getTranslations } from "next-intl/server";
import { TextLink } from "@/components/form-ui";
import { RunDrawForm } from "@/features/draw";
import type { GameSettings } from "@/features/game";
import { addDays } from "@/lib/game-phase";
import type { BroadcastEvent } from "@/features/mail";
import { daysBetween, formatGameDay, todayInMadrid } from "@/lib/game-time";
import type { Overview } from "./queries";
import { ResendBroadcastForm } from "./resend-broadcast-form";
import { canResend, showMailing } from "./resend-rules";
import { RefreshWhileSending } from "./refresh-while-sending";
import { ADMIN_PARTICIPANTS } from "./routes";

function Stat({
  label,
  value,
  note,
}: {
  label: string;
  value: React.ReactNode;
  note?: string;
}) {
  return (
    <div className="flex flex-1 flex-col gap-1">
      <span className="text-santa-ink text-[40px] leading-none font-bold">
        {value}
      </span>
      <span className="text-santa-muted text-xs">{label}</span>
      {note ? <span className="text-santa-muted text-xs">{note}</span> : null}
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
  participants,
  live = false,
}: {
  label: string;
  status: { total: number; sent: number };
  resend?: React.ReactNode;
  /** People in the game; when more than the emails, say why. */
  participants?: number;
  /** A mailing just started: refresh until it is done. */
  live?: boolean;
}) {
  const t = await getTranslations("admin.overview");
  const done = status.sent >= status.total;
  const sending = live && !done;
  return (
    <div className="border-santa-line flex flex-col gap-3 rounded-2xl border p-4">
      <p className="text-santa-ink text-sm font-semibold">{label}</p>
      <p className="text-santa-muted text-sm">
        {t("sentOf", { sent: status.sent, total: status.total })}
      </p>
      {participants !== undefined && participants > status.total ? (
        <p className="text-santa-muted text-xs leading-relaxed">
          {t("mailPerAccount")}
        </p>
      ) : null}
      {sending ? (
        <output className="text-santa-muted block text-xs">
          {t("sending")}
          <RefreshWhileSending />
        </output>
      ) : null}
      {done || sending ? null : resend}
    </div>
  );
}

/** The draw mail goes out right after the draw; watch it for a few minutes. */
const LIVE_AFTER_DRAW_MS = 3 * 60_000;

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
          <Stat
            label={t("participants")}
            value={overview.participants}
            note={
              overview.children > 0
                ? t("childrenOf", { count: overview.children })
                : undefined
            }
          />
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
  // The reminder goes out giftsEndOn - 2 days, never before the gifts start.
  const reminderFrom = addDays(settings.giftsEndOn, -2);
  const reminderOn = formatGameDay(
    reminderFrom > settings.giftsStartOn ? reminderFrom : settings.giftsStartOn,
    locale,
  );
  const revealOn = formatGameDay(settings.revealOn, locale);

  const now = Date.now();
  const childrenNote =
    overview.children > 0
      ? t("childrenOf", { count: overview.children })
      : undefined;
  const mailing = (event: BroadcastEvent, label: string) =>
    showMailing(event, settings) ? (
      <BroadcastStatus
        key={event}
        label={label}
        status={overview.broadcasts[event]}
        participants={overview.participants}
        live={
          event === "draw" &&
          !!settings.drawnAt &&
          now - settings.drawnAt.getTime() < LIVE_AFTER_DRAW_MS
        }
        resend={
          canResend(event, settings) ? (
            <ResendBroadcastForm event={event} />
          ) : undefined
        }
      />
    ) : null;

  if (overview.phase === "waiting") {
    return (
      <div className="flex flex-col gap-5">
        <StageCard title={t("drawnTitle")} />
        {overview.exitRequests > 0 ? (
          <div className="bg-santa-yellow flex flex-col gap-2 rounded-2xl p-[18px]">
            <p className="text-santa-ink text-base font-bold">
              {t("exitTitle", { count: overview.exitRequests })}
            </p>
            <p className="text-santa-ink text-sm leading-relaxed">
              {t("exitText")}
            </p>
            <TextLink href={ADMIN_PARTICIPANTS}>{t("exitLink")}</TextLink>
          </div>
        ) : null}
        <div className="flex gap-5">
          <Stat
            label={t("inChain")}
            value={overview.participants}
            note={childrenNote}
          />
          <Stat label={t("daysTo", { date: giftsOn })} value={days} />
        </div>
        {mailing("draw", t("drawMail"))}
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
          <Stat
            label={t("inChain")}
            value={overview.participants}
            note={childrenNote}
          />
          <Stat label={t("giftsMarked")} value={overview.giftsMarked} />
        </div>
        {helpBox}
        <Stat label={t("waitingBackup")} value={overview.backupNeeded} />
        {mailing("gifts-open", t("giftsOpenMail", { date: giftsOn }))}
        {mailing("reminder", t("reminderMail", { date: reminderOn }))}
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
      {mailing("reveal", t("revealMail", { date: revealOn }))}
      {mailing("reminder", t("reminderMail", { date: reminderOn }))}
      <p className="text-santa-muted text-sm leading-relaxed">
        {t("purgeNote", { date: formatGameDay(settings.closeOn, locale) })}
      </p>
    </div>
  );
}
