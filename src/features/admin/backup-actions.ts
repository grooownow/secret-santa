"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db/client";
import { assignments, participants, users } from "@/db/schema";
import { requireOrganizer } from "@/features/auth";
import { getSettings } from "@/features/game";
import { renderEmail, sendOnce } from "@/features/mail";
import { isLocale } from "@/i18n/locale";
import { logger } from "@/lib/logger";
import { todayInMadrid } from "@/lib/game-time";
import { eligibleVolunteers, listBackupNeeded, listVolunteers } from "./backup";
import { ADMIN_BACKUP, ADMIN_PARTICIPANTS } from "./routes";

const idSchema = z.uuid();

/**
 * «Нужна замена»: the organizer puts a receiver on «Помощь» by hand, e.g.
 * when they know the Santa vanished. From the draw until the game closes.
 */
export async function markBackupNeeded(id: unknown): Promise<{ ok: boolean }> {
  await requireOrganizer();
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return { ok: false };
  const settings = await getSettings();
  if (!settings.drawnAt || todayInMadrid(new Date()) >= settings.closeOn) {
    return { ok: false };
  }
  const updated = await getDb()
    .update(assignments)
    .set({ backupRequestedAt: new Date() })
    .where(
      and(
        eq(assignments.receiverId, parsed.data),
        isNull(assignments.backupRequestedAt),
      ),
    )
    .returning();
  revalidatePath(ADMIN_PARTICIPANTS);
  revalidatePath(ADMIN_BACKUP);
  revalidatePath("/admin");
  return { ok: updated.length > 0 };
}

const assignSchema = z.object({
  participantId: z.uuid(),
  volunteerId: z.uuid(),
});

export type AssignResult = {
  ok: boolean;
  error?: "invalid" | "notNeeded" | "notVolunteer" | "ownFlat" | "mail";
};

/**
 * Asks a volunteer to prepare the gift of someone on «Помощь»: stores the
 * volunteer on the receiver's assignment and emails them the receiver's name,
 * building, flat, wishes and what to avoid — what any Santa sees. Not someone
 * from the receiver's own account or flat. The organizer still marks
 * «подарок организован» when it is done.
 */
export async function assignVolunteer(input: unknown): Promise<AssignResult> {
  await requireOrganizer();
  const parsed = assignSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { participantId, volunteerId } = parsed.data;

  const [needed, volunteers] = await Promise.all([
    listBackupNeeded(),
    listVolunteers(),
  ]);
  const target = needed.find((n) => n.participantId === participantId);
  if (!target) return { ok: false, error: "notNeeded" };
  const volunteer = volunteers.find((v) => v.userId === volunteerId);
  if (!volunteer) return { ok: false, error: "notVolunteer" };
  if (!eligibleVolunteers(target, [volunteer]).length) {
    return { ok: false, error: "ownFlat" };
  }

  const db = getDb();
  await db
    .update(assignments)
    .set({ backupVolunteerId: volunteerId })
    .where(eq(assignments.receiverId, participantId));

  const [[receiver], [account]] = await Promise.all([
    db
      .select({ wishes: participants.wishes, avoid: participants.avoid })
      .from(participants)
      .where(eq(participants.id, participantId))
      .limit(1),
    db
      .select({ email: users.email, locale: users.locale })
      .from(users)
      .where(eq(users.id, volunteerId))
      .limit(1),
  ]);
  revalidatePath(ADMIN_BACKUP);
  revalidatePath("/admin");
  if (!receiver || !account) return { ok: false, error: "invalid" };
  try {
    const mail = renderEmail(
      "backupAsk",
      isLocale(account.locale) ? account.locale : "ru",
      {
        receiver: {
          name: target.name,
          building: target.building,
          apartment: target.apartment,
          wishes: receiver.wishes,
          avoid: receiver.avoid,
        },
      },
    );
    // One mail per receiver and volunteer: asking again does not resend.
    await sendOnce(`backup:${participantId}:${volunteerId}`, {
      to: account.email,
      ...mail,
    });
  } catch (error) {
    logger.error({ err: error }, "could not mail the backup volunteer");
    return { ok: false, error: "mail" };
  }
  return { ok: true };
}
