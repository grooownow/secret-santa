"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db/client";
import { settings, wallPosts } from "@/db/schema";
import { requireVerifiedAccount } from "@/features/auth";
import { wallOpen } from "@/features/game";
import { getCurrentParticipant, readPhoto } from "@/features/profile";
import { postKey, scheduleTranslation } from "@/features/translation";
import { isLocale } from "@/i18n/locale";
import { CABINET_WALL } from "@/lib/cabinet-routes";
import { DEFAULT_DATES } from "@/lib/game-phase";
import { logger } from "@/lib/logger";
import { deletePhotos } from "@/lib/photo-storage";
import { postTextSchema } from "./schemas";
import type { PostState } from "./state";

class ClosedError extends Error {}

/**
 * Adds a post to the wall as the current participant of the signed-in
 * account. The wall's dates are re-checked inside the write transaction, and
 * the text is translated into the other languages after the response.
 */
export async function addPost(
  _prev: PostState,
  formData: FormData,
): Promise<PostState> {
  const account = await requireVerifiedAccount();
  const raw = formData.get("text");
  const rawText = typeof raw === "string" ? raw : "";
  const text = postTextSchema.safeParse(rawText);
  if (!text.success) return { error: "invalid", text: rawText };

  const author = await getCurrentParticipant(account.id);
  if (!author) return { error: "noParticipant", text: rawText };

  const photo = await readPhoto(formData);
  if (photo.kind === "error") {
    return {
      error: photo.error === "photoTooLarge" ? "photoTooLarge" : "photo",
      text: rawText,
    };
  }
  const photoUrl = photo.kind === "new" ? photo.url : null;

  let id: string;
  try {
    id = await getDb().transaction(async (tx) => {
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
      if (!wallOpen(new Date(), gate)) throw new ClosedError("closed");
      const [created] = await tx
        .insert(wallPosts)
        .values({ participantId: author.id, text: text.data, photoUrl })
        .returning();
      if (!created) throw new Error("post was not created");
      return created.id;
    });
  } catch (error) {
    if (photoUrl) await deletePhotos([photoUrl]).catch(() => {});
    if (error instanceof ClosedError) {
      return { error: "closed", text: rawText };
    }
    logger.error({ err: error }, "could not add the wall post");
    return { error: "failed", text: rawText };
  }

  await scheduleTranslation(
    postKey(id),
    text.data,
    isLocale(account.locale) ? account.locale : "en",
  );
  revalidatePath(CABINET_WALL);
  return { posted: true };
}
