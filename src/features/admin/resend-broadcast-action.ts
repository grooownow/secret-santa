"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOrganizer } from "@/features/auth";
import { getSettings } from "@/features/game";
import { runBroadcast } from "@/features/mail";
import { logger } from "@/lib/logger";
import { canResend } from "./resend-rules";

const eventSchema = z.enum(["draw", "gifts-open", "reminder", "reveal"]);

/**
 * "Дослать": sends the event's mail to those who have not got it. Only on
 * the days the daily job sends that mailing (`mailWindow`); each recipient is claimed first, so it
 * is safe to run while the first send is still going.
 */
export async function resendBroadcast(event: unknown): Promise<{
  total: number;
  sent: number;
  failed: number;
}> {
  await requireOrganizer();
  const stats = { total: 0, sent: 0, failed: 0 };
  const parsed = eventSchema.safeParse(event);
  if (!parsed.success) return stats;
  if (canResend(parsed.data, await getSettings())) {
    Object.assign(stats, await runBroadcast(parsed.data));
    logger.info({ ...stats, event: parsed.data }, "broadcast resent");
  }
  revalidatePath("/admin");
  return stats;
}
