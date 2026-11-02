import { getDb } from "@/db/client";
import { settings } from "@/db/schema";
import { DEFAULT_DATES, type GameSettings } from "./game-phase";

/**
 * Reads the single settings row (id = 1), creating it with the default dates
 * on first access. Every page calls this, so the common case is one read; the
 * idempotent insert runs only while the row is missing, which keeps
 * concurrent first calls safe.
 */
export async function getSettings(): Promise<GameSettings> {
  const db = getDb();
  const [existing] = await db.select().from(settings).limit(1);
  if (existing) return existing;
  await db
    .insert(settings)
    .values({ id: 1, ...DEFAULT_DATES })
    .onConflictDoNothing();
  const [row] = await db.select().from(settings).limit(1);
  if (!row) throw new Error("settings row missing after insert");
  return row;
}
