"use server";

import { and, eq, isNotNull, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { assignments } from "@/db/schema";
import { requireVerifiedAccount } from "@/features/auth";
import { getPhase, getSettings } from "@/features/game";
import { getOwnParticipant } from "@/features/profile";
import { logger } from "@/lib/logger";
import { participantIdSchema } from "./schemas";
import type { GiftState } from "./state";

/**
 * "Не нашёл подарок": the receiver says the gift is not at the place. Only
 * after the giver marked it and until the close day. The organizer's backup
 * list reads `notFoundAt`.
 */
export async function reportNotFound(
  participantId: unknown,
): Promise<GiftState> {
  const account = await requireVerifiedAccount();
  const id = participantIdSchema.safeParse(participantId);
  if (!id.success) return { error: "invalid" };
  if (!(await getOwnParticipant(account.id, id.data))) {
    return { error: "notFound" };
  }
  if (getPhase(new Date(), await getSettings()) === "closed") {
    return { error: "closed" };
  }
  try {
    const rows = await getDb()
      .update(assignments)
      .set({ notFoundAt: sql`coalesce(${assignments.notFoundAt}, now())` })
      .where(
        and(
          eq(assignments.receiverId, id.data),
          isNotNull(assignments.giftLeftAt),
        ),
      )
      .returning();
    if (rows.length === 0) return { error: "notMarked" };
  } catch (error) {
    logger.error({ err: error }, "could not report the missing gift");
    return { error: "failed" };
  }
  return { saved: true };
}

/** Form wrapper for `useActionState`. */
export async function reportNotFoundFormAction(
  _prev: GiftState,
  formData: FormData,
): Promise<GiftState> {
  return reportNotFound(formData.get("participantId"));
}
