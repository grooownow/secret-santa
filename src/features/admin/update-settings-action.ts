"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db/client";
import { settings } from "@/db/schema";
import { requireOrganizer } from "@/features/auth";
import { getSettings } from "@/features/game";
import { todayInMadrid } from "@/lib/game-time";
import { logger } from "@/lib/logger";
import { datesInOrder, datesSchema } from "./dates-schema";

export interface SettingsState {
  saved?: boolean;
  error?: "invalid" | "order" | "closeSoon" | "failed";
}

/**
 * Saves the game dates. Out-of-order dates are rejected. The write takes the
 * settings row `for update`, the same lock as the draw and withdrawals, so it
 * cannot interleave with them. Changing the draw date does not run the draw.
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

  try {
    await getSettings();
    await getDb().transaction(async (tx) => {
      await tx.select().from(settings).where(eq(settings.id, 1)).for("update");
      await tx.update(settings).set(parsed.data).where(eq(settings.id, 1));
    });
  } catch (error) {
    logger.error({ err: error }, "could not save the settings");
    return { error: "failed" };
  }
  revalidatePath("/", "layout");
  return { saved: true };
}
