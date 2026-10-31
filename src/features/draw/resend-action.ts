"use server";

import { revalidatePath } from "next/cache";
import { requireOrganizer } from "@/features/auth";
import { getSettings } from "@/features/game";
import { runBroadcast } from "@/features/mail";
import { logger } from "@/lib/logger";

/**
 * "Дослать": sends the draw mail to everyone who has not got it. Safe to run
 * while the first broadcast is still going: each recipient is claimed first.
 */
export async function resendDrawMail(): Promise<{
  total: number;
  sent: number;
  failed: number;
}> {
  await requireOrganizer();
  const stats = { total: 0, sent: 0, failed: 0 };
  if ((await getSettings()).drawnAt) {
    Object.assign(stats, await runBroadcast("draw"));
    logger.info(stats, "draw broadcast resent");
  }
  revalidatePath("/admin");
  return stats;
}
