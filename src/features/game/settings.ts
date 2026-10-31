import { getDb } from "@/db/client";
import { settings } from "@/db/schema";
import { DEFAULT_DATES, type GameSettings } from "./phase";

/**
 * Reads the single settings row (id = 1), creating it with the default dates
 * on first access. The insert is idempotent so concurrent first calls are safe.
 */
export async function getSettings(): Promise<GameSettings> {
  const db = getDb();
  await db
    .insert(settings)
    .values({ id: 1, ...DEFAULT_DATES })
    .onConflictDoNothing();
  const [row] = await db.select().from(settings).limit(1);
  if (!row) throw new Error("settings row missing after insert");
  return row;
}
