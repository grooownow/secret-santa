import "server-only";
import { runBroadcast, type BroadcastEvent } from "@/features/mail";
import { retryMissingTranslations } from "@/features/translation";
import { mailWindow } from "@/lib/game-phase";
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

export { addDays } from "@/lib/game-phase";

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

  // Windows shared with the admin's «Дослать» (see `mailWindow`).
  for (const event of ["gifts-open", "reminder", "reveal"] as const) {
    if (mailWindow(event, settings, today) === "open") {
      // oxlint-disable-next-line no-await-in-loop
      await broadcast(event);
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
