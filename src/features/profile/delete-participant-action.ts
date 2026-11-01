"use server";

import { and, eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { CABINET_PROFILE } from "@/lib/cabinet-routes";
import { getDb } from "@/db/client";
import { participants, wallPosts } from "@/db/schema";
import { requireVerifiedAccount } from "@/features/auth";
import {
  deleteTranslations,
  participantKeys,
  postKey,
} from "@/features/translation";
import { logger } from "@/lib/logger";
import { deletePhotos } from "@/lib/photo-storage";
import { assertGateOpen, canEdit, GateClosedError } from "./edit-gate";
import { idSchema } from "./schemas";
import type { ProfileState } from "./state";

/**
 * Deletes a participant of the signed-in account during the collect phase.
 * Deleting the owner's profile also deletes the children: they cannot play
 * without an adult.
 */
export async function deleteParticipantAction(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const account = await requireVerifiedAccount();
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { error: "notFound" };

  const db = getDb();
  const [row] = await db
    .select()
    .from(participants)
    .where(
      and(eq(participants.id, id.data), eq(participants.userId, account.id)),
    )
    .limit(1);
  if (!row) return { error: "notFound" };
  if (!(await canEdit())) return { error: "closed" };

  // Translations have no foreign key: collect their keys before the rows go.
  const doomed = await db
    .select({ id: participants.id })
    .from(participants)
    .where(
      row.kind === "adult"
        ? eq(participants.userId, account.id)
        : eq(participants.id, row.id),
    );
  const doomedIds = doomed.map((d) => d.id);
  const posts = doomedIds.length
    ? await db
        .select({ id: wallPosts.id })
        .from(wallPosts)
        .where(inArray(wallPosts.participantId, doomedIds))
    : [];

  let removed: (typeof participants.$inferSelect)[];
  try {
    removed = await db.transaction(async (tx) => {
      await assertGateOpen(tx, "edit");
      return tx
        .delete(participants)
        .where(
          row.kind === "adult"
            ? eq(participants.userId, account.id)
            : eq(participants.id, row.id),
        )
        .returning();
    });
  } catch (error) {
    if (error instanceof GateClosedError) return { error: "closed" };
    logger.error({ err: error }, "could not delete the participant");
    return { error: "failed" };
  }

  await deleteTranslations([
    ...doomedIds.flatMap(participantKeys),
    ...posts.map((p) => postKey(p.id)),
  ]).catch((error: unknown) =>
    logger.error({ err: error }, "could not delete translations"),
  );

  const photos = removed.flatMap((r) => (r.photoUrl ? [r.photoUrl] : []));
  await deletePhotos(photos).catch(() => {});
  redirect(CABINET_PROFILE);
}
