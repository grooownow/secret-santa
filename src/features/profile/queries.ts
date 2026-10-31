import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { participants } from "@/db/schema";

export type Participant = typeof participants.$inferSelect;

/** The account's participants: the adult first, then children by age of entry. */
export async function listParticipants(userId: string): Promise<Participant[]> {
  const rows = await getDb()
    .select()
    .from(participants)
    .where(eq(participants.userId, userId))
    .orderBy(asc(participants.createdAt));
  return [...rows].sort(
    (a, b) => Number(b.kind === "adult") - Number(a.kind === "adult"),
  );
}

/** A participant of this account, or null: other accounts' ids never match. */
export async function getOwnParticipant(
  userId: string,
  id: string,
): Promise<Participant | null> {
  const [row] = await getDb()
    .select()
    .from(participants)
    .where(and(eq(participants.id, id), eq(participants.userId, userId)))
    .limit(1);
  return row ?? null;
}
