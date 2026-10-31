import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { participants, users, wallPosts } from "@/db/schema";
import { isLocale, type Locale } from "@/i18n/locale";

export interface WallPost {
  id: string;
  /** Only the name: no apartment, no email, no building. */
  authorName: string;
  authorLocale: Locale;
  text: string;
  photoUrl: string | null;
  createdAt: Date;
  /** The viewer's own post, or any post for the organizer. */
  canDelete: boolean;
}

/** All posts, newest first. */
export async function listPosts(viewer: {
  userId: string;
  organizer: boolean;
}): Promise<WallPost[]> {
  const rows = await getDb()
    .select({
      id: wallPosts.id,
      text: wallPosts.text,
      photoUrl: wallPosts.photoUrl,
      createdAt: wallPosts.createdAt,
      authorName: participants.name,
      authorUserId: participants.userId,
      locale: users.locale,
    })
    .from(wallPosts)
    .innerJoin(participants, eq(participants.id, wallPosts.participantId))
    .innerJoin(users, eq(users.id, participants.userId))
    .orderBy(desc(wallPosts.createdAt), desc(wallPosts.id));
  return rows.map((row) => ({
    id: row.id,
    authorName: row.authorName,
    authorLocale: isLocale(row.locale) ? row.locale : "en",
    text: row.text,
    photoUrl: row.photoUrl,
    createdAt: row.createdAt,
    canDelete: viewer.organizer || row.authorUserId === viewer.userId,
  }));
}
