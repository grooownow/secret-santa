"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db/client";
import { settings } from "@/db/schema";
import { requireOrganizer } from "@/features/auth";
import { getPhase, getSettings, type Phase } from "@/features/game";
import { todayInMadrid } from "@/lib/game-time";
import { logger } from "@/lib/logger";
import { datesInOrder, datesSchema } from "./dates-schema";

export interface SettingsState {
  saved?: boolean;
  error?: "invalid" | "order" | "closeSoon" | "backwards" | "failed";
}

const PHASE_ORDER: Phase[] = [
  "collect",
  "waiting",
  "gifts",
  "reveal",
  "closed",
];

/**
 * Saves the game dates. Out-of-order dates are rejected. The write takes the
 * settings row `for update`, the same lock as the draw and withdrawals, so it
 * cannot interleave with them. Changing the draw date does not run the draw.
 * After the draw the new dates may not move today back to an earlier phase
 * (e.g. from gifts to waiting): that would reopen withdrawals after gifts
 * were left and hand a marked gift to a new Santa.
 */
export async function updateSettings(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  await requireOrganizer();
  const parsed = datesSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "invalid" };
  if (!datesInOrder(parsed.data)) return { error: "order" };
  // A closing day of today or earlier would purge the game at once.
  if (parsed.data.closeOn <= todayInMadrid(new Date())) {
    return { error: "closeSoon" };
  }

  let backwards = false;
  try {
    await getSettings();
    await getDb().transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(settings)
        .where(eq(settings.id, 1))
        .for("update");
      if (!row) throw new Error("settings row missing");
      const now = new Date();
      const before = PHASE_ORDER.indexOf(getPhase(now, row));
      const after = PHASE_ORDER.indexOf(
        getPhase(now, { ...row, ...parsed.data }),
      );
      if (row.drawnAt && after < before) {
        backwards = true;
        return;
      }
      await tx.update(settings).set(parsed.data).where(eq(settings.id, 1));
    });
  } catch (error) {
    logger.error({ err: error }, "could not save the settings");
    return { error: "failed" };
  }
  if (backwards) return { error: "backwards" };
  revalidatePath("/", "layout");
  return { saved: true };
}
