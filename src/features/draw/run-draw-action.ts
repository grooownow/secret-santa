"use server";

import { eq, isNotNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db/client";
import { assignments, participants, settings, users } from "@/db/schema";
import { requireOrganizer } from "@/features/auth";
import { getPhase, getSettings } from "@/features/game";
import { runBroadcast } from "@/features/mail";
import { flatKey } from "@/features/profile";
import { logger } from "@/lib/logger";
import { runAfterResponse } from "@/lib/run-after-response";
import { buildChain, type ChainFailure, type DrawEntry } from "./build-chain";

export type DrawResult =
  | { ok: true; links: number }
  | {
      ok: false;
      reason: ChainFailure | "already_drawn" | "closed" | "failed";
      /** Normalised flat key, e.g. `K:24`, for `household_too_large`. */
      flat?: string;
    };

/**
 * Runs the draw once. Only participants of accounts with a confirmed email
 * take part; a child's flat is its account's flat. Pairs are written and
 * `drawnAt` is set in one transaction that holds a lock on the settings row,
 * so a double click or two tabs produce one chain. The draw mail goes out
 * after the response (see `runAfterResponse`); `runBroadcast` is safe to
 * repeat, so a rerun only sends what is missing. Only counts are logged.
 */
export async function runDraw(): Promise<DrawResult> {
  await requireOrganizer();
  // Makes sure the settings row exists before it is locked.
  await getSettings();

  const result = await getDb().transaction(async (tx): Promise<DrawResult> => {
    const [row] = await tx
      .select()
      .from(settings)
      .where(eq(settings.id, 1))
      .for("update");
    if (!row) throw new Error("settings row missing");
    if (row.drawnAt) return { ok: false, reason: "already_drawn" };
    if (getPhase(new Date(), row) === "closed") {
      return { ok: false, reason: "closed" };
    }

    const people = await tx
      .select({
        id: participants.id,
        userId: participants.userId,
        building: users.building,
        apartment: users.apartment,
      })
      .from(participants)
      .innerJoin(users, eq(users.id, participants.userId))
      .where(isNotNull(users.emailVerified));
    const entries: DrawEntry[] = people.map((p) => ({
      id: p.id,
      // No flat on file cannot happen for a profile owner; such a person
      // simply counts as their own flat.
      flat:
        p.building && p.apartment
          ? flatKey(p.building, p.apartment)
          : `none:${p.userId}`,
    }));

    const chain = buildChain(entries);
    if (!chain.ok) {
      return { ok: false, reason: chain.reason, flat: chain.flat };
    }

    await tx.insert(assignments).values(chain.links);
    await tx
      .update(settings)
      .set({ drawnAt: new Date() })
      .where(eq(settings.id, 1));
    return { ok: true, links: chain.links.length };
  });

  if (result.ok) {
    logger.info({ links: result.links }, "draw completed");
    runAfterResponse(async () => {
      try {
        const stats = await runBroadcast("draw");
        logger.info(stats, "draw broadcast finished");
      } catch (error) {
        logger.error({ err: error }, "draw broadcast failed");
      }
    });
    revalidatePath("/admin");
  } else {
    logger.info({ reason: result.reason }, "draw refused");
  }
  return result;
}
