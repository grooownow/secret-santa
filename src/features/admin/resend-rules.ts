import type { GameSettings } from "@/features/game";
import type { BroadcastEvent } from "@/features/mail";
import { mailWindow } from "@/lib/game-phase";
import { todayInMadrid } from "@/lib/game-time";

/**
 * «Дослать» works only on the days the daily job itself sends that mailing
 * (`mailWindow`), so it cannot send the reminder early and use up the keys
 * of the real one.
 */
export function canResend(
  event: BroadcastEvent,
  settings: GameSettings,
  now: Date = new Date(),
): boolean {
  return mailWindow(event, settings, todayInMadrid(now)) === "open";
}

/** The status block is hidden before its window: «0 of N» would look failed. */
export function showMailing(
  event: BroadcastEvent,
  settings: GameSettings,
  now: Date = new Date(),
): boolean {
  return mailWindow(event, settings, todayInMadrid(now)) !== "before";
}
