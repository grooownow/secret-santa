"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db/client";
import { assignments } from "@/db/schema";
import { requireOrganizer } from "@/features/auth";
import { logger } from "@/lib/logger";
import { ADMIN_BACKUP } from "./routes";

const idSchema = z.uuid();

/**
 * "Подарок организован": the organizer arranged a backup gift for this
 * receiver, so they leave the list and the reveal shows "Запасной Санта".
 */
export async function organizeBackup(id: unknown): Promise<{ ok: boolean }> {
  await requireOrganizer();
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return { ok: false };
  const updated = await getDb()
    .update(assignments)
    .set({ backupOrganizedAt: new Date() })
    .where(
      and(
        eq(assignments.receiverId, parsed.data),
        isNull(assignments.backupOrganizedAt),
      ),
    )
    .returning();
  logger.info({ changed: updated.length }, "backup gift organized");
  revalidatePath(ADMIN_BACKUP);
  revalidatePath("/admin");
  return { ok: updated.length > 0 };
}
