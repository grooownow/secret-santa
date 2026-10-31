import "server-only";
import { runBroadcast, type BroadcastEvent } from "@/features/mail";
import { retryMissingTranslations } from "@/features/translation";
import { todayInMadrid } from "@/lib/game-time";
import { logger } from "@/lib/logger";
import { getSettings } from "./settings";
import { purgeAll } from "./purge";

export type BroadcastReport = {
  total: number;
  sent: number;
  failed: number;
};

export type DailyReport = {
  today: string;
  broadcasts: Partial<Record<BroadcastEvent, BroadcastReport>>;
  /** Translation retry counts, absent when it did not run or crashed. */
  translations?: { done: number; failed: number };
  purge: "purged" | "skipped" | "failed";
  /** True when any step crashed or any email failed: the route answers 500. */
  failed: boolean;
};

/** `YYYY-MM-DD` shifted by whole days (calendar arithmetic, no time zones). */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * The once-a-day job (Vercel cron, 08:00 UTC = 09:00/10:00 in Madrid).
 *
 * Dates come from the settings row, so dates moved by the organizer are
 * honoured. Every broadcast is idempotent (`sendOnce`), so each one keeps
 * being attempted on the following days of its window to catch stragglers
 * whose send failed:
 *  - gifts-open: from giftsStartOn until revealOn (exclusive)
 *  - reminder: giftsEndOn - 2 days (never before giftsStartOn) through
 *    giftsEndOn, only for gifts not marked as left
 *  - reveal: from revealOn until closeOn (exclusive)
 * Nothing is sent before the draw. From closeOn the job only purges.
 */
export async function runDaily(now: Date): Promise<DailyReport> {
  const settings = await getSettings();
  const today = todayInMadrid(now);
  const report: DailyReport = {
    today,
    broadcasts: {},
    purge: "skipped",
    failed: false,
  };

  if (today >= settings.closeOn) {
    if (!settings.purgedAt) {
      try {
        report.purge = await purgeAll(now);
      } catch (error) {
        report.purge = "failed";
        report.failed = true;
        logger.error({ err: error }, "purge failed");
      }
    }
    return report;
  }

  const broadcast = async (event: BroadcastEvent) => {
    try {
      const result = await runBroadcast(event);
      report.broadcasts[event] = result;
      if (result.failed > 0) report.failed = true;
    } catch (error) {
      report.failed = true;
      logger.error({ err: error, event }, "daily broadcast crashed");
    }
  };

  if (settings.drawnAt) {
    const reminderFrom = addDays(settings.giftsEndOn, -2);
    if (today >= settings.giftsStartOn && today < settings.revealOn) {
      await broadcast("gifts-open");
    }
    if (
      today >= settings.giftsStartOn &&
      today >= reminderFrom &&
      today <= settings.giftsEndOn
    ) {
      await broadcast("reminder");
    }
    if (today >= settings.revealOn) {
      await broadcast("reveal");
    }
  }

  try {
    report.translations = await retryMissingTranslations();
  } catch (error) {
    report.failed = true;
    logger.error({ err: error }, "translation retry crashed");
  }
  return report;
}
