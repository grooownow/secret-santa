"use server";

import { and, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db/client";
import { assignments, participants, settings, users } from "@/db/schema";
import { requireVerifiedAccount } from "@/features/auth";
import { canMarkGift } from "@/features/game";
import { renderEmail, sendOnce } from "@/features/mail";
import { getOwnParticipant } from "@/features/profile";
import { isLocale } from "@/i18n/locale";
import { DEFAULT_DATES } from "@/lib/game-phase";
import { giftPath, recipientPath } from "@/lib/cabinet-routes";
import { logger } from "@/lib/logger";
import { runAfterResponse } from "@/lib/run-after-response";
import { markGiftSchema } from "./schemas";
import type { GiftState } from "./state";

class GateClosedError extends Error {}
class AlreadyLeftError extends Error {}

/**
 * "Подарок оставлен": the giver of `participantId` sets the place and an
 * optional note, once. Works 25-31 December only; the phase is re-checked
 * inside the transaction under a shared lock on the settings row. The mark is
 * final (owner's call, 2 Nov: "leave it and forget it"): a second save is
 * refused with `alreadyLeft`. The receiver gets one email
 * (`gift:<receiver>:<n>`) that mentions only the receiver. There is no number
 * or code field any more (the lockers and mailboxes have none); `code` is
 * stored as null.
 */
export async function markGift(input: unknown): Promise<GiftState> {
  const account = await requireVerifiedAccount();
  const parsed = markGiftSchema.safeParse(input);
  if (!parsed.success) return { error: "invalid" };
  const { participantId, place, note } = parsed.data;
  const code = null;

  if (!(await getOwnParticipant(account.id, participantId))) {
    return { error: "notFound" };
  }

  const db = getDb();
  let saved: typeof assignments.$inferSelect | undefined;
  try {
    saved = await db.transaction(async (tx) => {
      await tx
        .insert(settings)
        .values({ id: 1, ...DEFAULT_DATES })
        .onConflictDoNothing();
      const [gate] = await tx
        .select()
        .from(settings)
        .where(eq(settings.id, 1))
        .for("share");
      if (!gate) throw new Error("settings row missing");
      if (!canMarkGift(new Date(), gate)) throw new GateClosedError("closed");
      const [current] = await tx
        .select({ leftAt: assignments.giftLeftAt })
        .from(assignments)
        .where(eq(assignments.giverId, participantId))
        .for("update");
      if (!current) return undefined;
      if (current.leftAt) throw new AlreadyLeftError("already left");
      const [row] = await tx
        .update(assignments)
        .set({
          giftPlace: place,
          giftCode: code,
          giftNote: note,
          giftLeftAt: sql`now()`,
          giftVersion: sql`${assignments.giftVersion} + 1`,
        })
        .where(
          and(
            eq(assignments.giverId, participantId),
            isNull(assignments.giftLeftAt),
          ),
        )
        .returning();
      return row;
    });
  } catch (error) {
    if (error instanceof GateClosedError) return { error: "closed" };
    if (error instanceof AlreadyLeftError) return { error: "alreadyLeft" };
    logger.error({ err: error }, "could not mark the gift");
    return { error: "failed" };
  }
  if (!saved) return { error: "notFound" };

  // The form, the recipient card and «Мой подарок» must show the new data.
  revalidatePath(giftPath(participantId));
  revalidatePath(recipientPath(participantId));
  revalidatePath("/home");

  const { receiverId, giftVersion } = saved;
  runAfterResponse(async () => {
    try {
      const [receiver] = await db
        .select({
          name: participants.name,
          email: users.email,
          locale: users.locale,
        })
        .from(participants)
        .innerJoin(users, eq(users.id, participants.userId))
        .where(eq(participants.id, receiverId))
        .limit(1);
      if (!receiver) return;
      const mail = renderEmail(
        "giftWaiting",
        isLocale(receiver.locale) ? receiver.locale : "en",
        { names: [receiver.name], place, code, note },
      );
      await sendOnce(`gift:${receiverId}:${giftVersion}`, {
        to: receiver.email,
        ...mail,
      });
    } catch (error) {
      logger.error({ err: error }, "could not send the gift email");
    }
  });
  return { saved: true };
}

/** Form wrapper for `useActionState`. */
export async function markGiftFormAction(
  _prev: GiftState,
  formData: FormData,
): Promise<GiftState> {
  const text = (key: string) => {
    const value = formData.get(key);
    return typeof value === "string" ? value : "";
  };
  const values = {
    place: text("place"),
    note: text("note"),
  };
  const result = await markGift({
    participantId: text("participantId"),
    ...values,
  });
  // Keep the typed values on success too: React resets the form after the
  // action, and it must reset to what was just saved, not to the old data.
  return { ...result, values };
}
