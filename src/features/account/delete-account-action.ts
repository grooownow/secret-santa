"use server";

import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db/client";
import { participants, settings, users, wallPosts } from "@/db/schema";
import { requireAccount } from "@/features/auth";
import {
  deleteTranslations,
  participantKeys,
  postKey,
} from "@/features/translation";
import { DEFAULT_DATES, getPhase } from "@/lib/game-phase";
import { isAdminEmail } from "@/lib/admin-email";
import { signOut } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { deletePhotos } from "@/lib/photo-storage";

export interface DeleteAccountState {
  deleted?: boolean;
  error?: "closed" | "failed";
}

const schema = z.object({ confirm: z.literal("yes") });

/**
 * Deletes the signed-in account with its participants, photos, translations
 * and wall posts. Only while applications are collected: the phase is
 * re-checked inside the transaction under a shared lock on the settings row
 * (the draw takes it `for update`), so it cannot slip in beside the draw.
 * After the draw the account leaves through the organizer instead.
 */
export async function deleteAccountAction(
  _prev: DeleteAccountState,
  formData: FormData,
): Promise<DeleteAccountState> {
  const account = await requireAccount();
  if (!schema.safeParse({ confirm: formData.get("confirm") }).success) {
    return { error: "failed" };
  }

  type Outcome =
    { open: false } | { open: true; photos: string[]; keys: string[] };
  let outcome: Outcome;
  try {
    outcome = await getDb().transaction(async (tx): Promise<Outcome> => {
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
      if (getPhase(new Date(), row) !== "collect") return { open: false };

      const mine = await tx
        .select()
        .from(participants)
        .where(eq(participants.userId, account.id));
      const ids = mine.map((p) => p.id);
      const posts = ids.length
        ? await tx
            .select({ id: wallPosts.id, photoUrl: wallPosts.photoUrl })
            .from(wallPosts)
            .where(inArray(wallPosts.participantId, ids))
        : [];
      if (isAdminEmail(account.email)) {
        // The organizer leaves the game, not the admin: the account stays.
        if (ids.length) {
          await tx.delete(participants).where(inArray(participants.id, ids));
        }
      } else {
        // Cascades remove participants, tokens and OAuth links.
        await tx.delete(users).where(eq(users.id, account.id));
      }
      return {
        open: true,
        photos: [
          ...mine.flatMap((p) => (p.photoUrl ? [p.photoUrl] : [])),
          ...posts.flatMap((p) => (p.photoUrl ? [p.photoUrl] : [])),
        ],
        keys: [
          ...ids.flatMap(participantKeys),
          ...posts.map((p) => postKey(p.id)),
        ],
      };
    });
  } catch (error) {
    logger.error({ err: error }, "could not delete the account");
    return { error: "failed" };
  }
  if (!outcome.open) return { error: "closed" };

  await deleteTranslations(outcome.keys).catch((error: unknown) =>
    logger.error({ err: error }, "could not delete translations"),
  );
  await deletePhotos(outcome.photos).catch((error: unknown) =>
    logger.error({ err: error }, "could not delete photos"),
  );
  logger.info("account deleted by its owner");
  await signOut({ redirectTo: "/" });
  return { deleted: true };
}
