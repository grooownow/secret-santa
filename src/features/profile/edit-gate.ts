import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { settings } from "@/db/schema";
import { getPhase, getSettings, registrationOpen } from "@/features/game";
import { DEFAULT_DATES } from "@/lib/game-phase";

type Db = ReturnType<typeof getDb>;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/**
 * Profiles can be created while registration is open and changed or deleted
 * during the collect phase only (spec, "Анкета").
 */
export async function canCreate(): Promise<boolean> {
  return registrationOpen(new Date(), await getSettings());
}

export async function canEdit(): Promise<boolean> {
  return getPhase(new Date(), await getSettings()) === "collect";
}

/** Thrown inside a write transaction when the gate is closed; rolls it back. */
export class GateClosedError extends Error {}

/**
 * The gate re-checked inside the write transaction, under a shared lock on the
 * settings row. The draw takes that row `for update`, so a write either
 * commits before the draw reads participants or finds the gate closed.
 * Throws `GateClosedError` (rolling the transaction back) when closed.
 */
export async function assertGateOpen(
  tx: Tx,
  mode: "create" | "edit",
): Promise<void> {
  // Uses `tx`, never `getDb()`: another connection would wait for this one.
  await tx
    .insert(settings)
    .values({ id: 1, ...DEFAULT_DATES })
    .onConflictDoNothing();
  const [row] = await tx
    .select()
    .from(settings)
    .where(eq(settings.id, 1))
    .for("share");
  if (!row) throw new Error("settings row missing");
  const now = new Date();
  const open =
    mode === "create"
      ? registrationOpen(now, row)
      : getPhase(now, row) === "collect";
  if (!open) throw new GateClosedError("closed");
}
