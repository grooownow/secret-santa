import { count, eq, isNotNull, isNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import { assignments, participants, users } from "@/db/schema";
import { requireOrganizer } from "@/features/auth";
import { getPhase, getSettings, type Phase } from "@/features/game";
import { broadcastStatus } from "@/features/mail";

export type Overview = {
  phase: Phase;
  /** Collect: players with a confirmed email. Later: people in the chain. */
  participants: number;
  /** Participants on accounts whose email is not confirmed (not in the draw). */
  excluded: number;
  giftsMarked: number;
  /** Progress of the draw email. */
  broadcast: { total: number; sent: number };
};

/**
 * Numbers for the organizer's overview. Counts only: no giver, no receiver,
 * no names, so the pairing cannot leak through this page.
 */
export async function getOverview(): Promise<Overview> {
  await requireOrganizer();
  const db = getDb();
  const settings = await getSettings();

  const [eligible, excluded, chain, marked, broadcast] = await Promise.all([
    db
      .select({ n: count() })
      .from(participants)
      .innerJoin(users, eq(users.id, participants.userId))
      .where(isNotNull(users.emailVerified)),
    db
      .select({ n: count() })
      .from(participants)
      .innerJoin(users, eq(users.id, participants.userId))
      .where(isNull(users.emailVerified)),
    db.select({ n: count() }).from(assignments),
    db
      .select({ n: count() })
      .from(assignments)
      .where(isNotNull(assignments.giftLeftAt)),
    broadcastStatus("draw"),
  ]);

  return {
    phase: getPhase(new Date(), settings),
    participants: settings.drawnAt ? (chain[0]?.n ?? 0) : (eligible[0]?.n ?? 0),
    excluded: excluded[0]?.n ?? 0,
    giftsMarked: marked[0]?.n ?? 0,
    broadcast,
  };
}
