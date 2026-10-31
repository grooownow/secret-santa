"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { participants } from "@/db/schema";
import { requireVerifiedAccount } from "@/features/auth";
import { HOME } from "@/features/account";
import { deletePhotos } from "@/lib/photo-storage";
import { canEdit } from "./edit-gate";
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

  const removed = await db
    .delete(participants)
    .where(
      row.kind === "adult"
        ? eq(participants.userId, account.id)
        : eq(participants.id, row.id),
    )
    .returning();

  const photos = removed.flatMap((r) => (r.photoUrl ? [r.photoUrl] : []));
  await deletePhotos(photos).catch(() => {});
  redirect(HOME);
}
