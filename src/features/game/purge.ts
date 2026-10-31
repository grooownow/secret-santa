import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  accounts,
  assignments,
  authTokens,
  guesses,
  participants,
  sentEmails,
  settings,
  translationAttempts,
  translations,
  users,
  wallPosts,
} from "@/db/schema";
import { deleteAllPhotos } from "@/lib/photo-storage";
import { todayInMadrid } from "@/lib/game-time";

export type PurgeResult = "purged" | "skipped";

/**
 * The January 10 purge: removes every piece of personal data and keeps only
 * the settings row, which gets `purgedAt`.
 *
 * Runs in one transaction holding the settings row `for update`. Every writer
 * (wall, profile, gifts, guesses) takes that row `for share` and re-checks the
 * phase, so no write can slip in between collecting the photo URLs and the
 * deletes; after the commit the phase is closed and they all refuse.
 *
 * Photos are deleted first and a failure aborts the whole purge: the rows
 * still hold the URLs, so the next daily run retries. `purgedAt` is therefore
 * set only when every blob is gone. Does nothing before `closeOn` (also when
 * the organizer moved it later) or when already purged.
 */
export async function purgeAll(now: Date = new Date()): Promise<PurgeResult> {
  return getDb().transaction(async (tx) => {
    const [gate] = await tx
      .select()
      .from(settings)
      .where(eq(settings.id, 1))
      .for("update");
    if (!gate || gate.purgedAt) return "skipped";
    if (todayInMadrid(now) < gate.closeOn) return "skipped";

    const photoRows = await tx
      .select({ url: participants.photoUrl })
      .from(participants);
    const postRows = await tx
      .select({ url: wallPosts.photoUrl })
      .from(wallPosts);
    const urls = [...photoRows, ...postRows]
      .map((row) => row.url)
      .filter((url): url is string => !!url);
    await deleteAllPhotos(urls);

    await tx.delete(wallPosts);
    await tx.delete(guesses);
    await tx.delete(assignments);
    await tx.delete(authTokens);
    await tx.delete(sentEmails);
    await tx.delete(translations);
    await tx.delete(translationAttempts);
    await tx.delete(participants);
    await tx.delete(accounts);
    await tx.delete(users);
    await tx.update(settings).set({ purgedAt: now }).where(eq(settings.id, 1));
    return "purged";
  });
}
