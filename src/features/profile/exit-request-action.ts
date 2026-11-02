"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db/client";
import { participants, users } from "@/db/schema";
import { requireVerifiedAccount } from "@/features/auth";
import { canExit, getSettings } from "@/features/game";
import { renderEmail, sendOnce } from "@/features/mail";
import { isLocale } from "@/i18n/locale";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { runAfterResponse } from "@/lib/run-after-response";
import { getOwnParticipant } from "./queries";
import { EXIT_COMMENT_MAX } from "./schemas";

const exitSchema = z.object({
  participantId: z.uuid(),
  comment: z
    .string()
    .trim()
    .max(EXIT_COMMENT_MAX)
    .transform((value) => value || null),
});

export interface ExitRequestState {
  error?: "invalid" | "notFound" | "closed" | "failed";
  saved?: boolean;
  comment?: string;
}

/**
 * «Не могу участвовать»: the account asks the organizer to take one of its
 * participants out of the game (an adult takes the whole family with them,
 * as «Выбытие» does). Only between the draw and 24 December, like the
 * withdrawal itself. Stores the request on the participant and emails the
 * organizer (ADMIN_EMAIL); nothing in the chain changes until the organizer
 * confirms with «Выбытие». Asking again updates the comment and mails again.
 */
export async function requestExitAction(
  _prev: ExitRequestState,
  formData: FormData,
): Promise<ExitRequestState> {
  const account = await requireVerifiedAccount();
  const comment = String(formData.get("comment") ?? "");
  const parsed = exitSchema.safeParse({
    participantId: formData.get("participantId"),
    comment,
  });
  if (!parsed.success) return { error: "invalid", comment };
  const { participantId } = parsed.data;

  const person = await getOwnParticipant(account.id, participantId);
  if (!person) return { error: "notFound", comment };
  if (!canExit(new Date(), await getSettings())) {
    return { error: "closed", comment };
  }

  const db = getDb();
  let requestedAt: Date;
  try {
    const [row] = await db
      .update(participants)
      .set({ exitRequestedAt: sql`now()`, exitComment: parsed.data.comment })
      .where(
        and(
          eq(participants.id, participantId),
          eq(participants.userId, account.id),
        ),
      )
      .returning();
    if (!row?.exitRequestedAt) return { error: "notFound", comment };
    requestedAt = row.exitRequestedAt;
  } catch (error) {
    logger.error({ err: error }, "could not store the exit request");
    return { error: "failed", comment };
  }

  const organizer = env.ADMIN_EMAIL;
  if (organizer) {
    runAfterResponse(async () => {
      try {
        const [admin] = await db
          .select({ locale: users.locale })
          .from(users)
          .where(eq(users.email, organizer.toLowerCase()))
          .limit(1);
        const locale = admin && isLocale(admin.locale) ? admin.locale : "ru";
        const mail = renderEmail("exitRequest", locale, {
          person: person.name,
          comment: parsed.data.comment,
          url: `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/admin/participants`,
        });
        await sendOnce(`exit:${participantId}:${requestedAt.getTime()}`, {
          to: organizer,
          ...mail,
        });
      } catch (error) {
        logger.error({ err: error }, "could not mail the exit request");
      }
    });
  } else {
    logger.warn("exit request stored, but ADMIN_EMAIL is not set");
  }

  revalidatePath("/home", "layout");
  revalidatePath("/admin", "layout");
  return { saved: true };
}
