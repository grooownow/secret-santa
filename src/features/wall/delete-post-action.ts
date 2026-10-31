"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db/client";
import { participants, wallPosts } from "@/db/schema";
import { isOrganizer, requireVerifiedAccount } from "@/features/auth";
import { deleteTranslations, postKey } from "@/features/translation";
import { CABINET_WALL } from "@/lib/cabinet-routes";
import { logger } from "@/lib/logger";
import { deletePhotos } from "@/lib/photo-storage";
import { postIdSchema } from "./schemas";

export interface DeleteState {
  deleted?: boolean;
  error?: "notFound" | "failed";
}

/**
 * Deletes a post: its author's account may, and so may the organizer, who is
 * checked here on the server. A foreign post gets the same answer as a
 * missing one. The photo and the translations go with the post.
 */
export async function deletePost(id: unknown): Promise<DeleteState> {
  const account = await requireVerifiedAccount();
  const parsed = postIdSchema.safeParse(id);
  if (!parsed.success) return { error: "notFound" };

  const db = getDb();
  const [post] = await db
    .select({
      photoUrl: wallPosts.photoUrl,
      authorUserId: participants.userId,
    })
    .from(wallPosts)
    .innerJoin(participants, eq(participants.id, wallPosts.participantId))
    .where(eq(wallPosts.id, parsed.data))
    .limit(1);
  if (!post) return { error: "notFound" };
  if (post.authorUserId !== account.id && !isOrganizer(account)) {
    return { error: "notFound" };
  }

  try {
    await db.delete(wallPosts).where(eq(wallPosts.id, parsed.data));
  } catch (error) {
    logger.error({ err: error }, "could not delete the wall post");
    return { error: "failed" };
  }
  await deleteTranslations([postKey(parsed.data)]).catch((error: unknown) =>
    logger.error({ err: error }, "could not delete post translations"),
  );
  if (post.photoUrl) {
    await deletePhotos([post.photoUrl]).catch((error: unknown) =>
      logger.error({ err: error }, "could not delete the post photo"),
    );
  }
  revalidatePath(CABINET_WALL);
  return { deleted: true };
}
