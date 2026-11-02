import { and, count, eq, isNotNull, isNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import { assignments, participants, users } from "@/db/schema";
import { requireOrganizer } from "@/features/auth";
import { getPhase, getSettings, type Phase } from "@/features/game";
import { broadcastStatuses, type BroadcastEvent } from "@/features/mail";
import { listBackupNeeded, listBackupOrganized } from "./backup";

const EVENTS: BroadcastEvent[] = ["draw", "gifts-open", "reminder", "reveal"];

export type Overview = {
  phase: Phase;
  /** Collect: players with a confirmed email. Later: people in the chain. */
  participants: number;
  /** «Не могу участвовать» requests waiting for «Выбытие». */
  exitRequests: number;
  /** How many of `participants` are children (they get no email of their own). */
  children: number;
  /** Participants on accounts whose email is not confirmed (not in the draw). */
  excluded: number;
  giftsMarked: number;
  /** Progress of each mailing (draw, 25 Dec, 29 Dec, 1 Jan). */
  broadcasts: Record<BroadcastEvent, { total: number; sent: number }>;
  /** Participants waiting for a backup Santa, and those already arranged. */
  backupNeeded: number;
  backupOrganized: number;
};

export interface ParticipantRow {
  id: string;
  name: string;
  kind: "adult" | "child";
  building: string | null;
  apartment: string | null;
  /** Whether the account's email is confirmed (only then they are drawn). */
  verified: boolean;
  /** «Не могу участвовать» sent by the account, with its comment. */
  exitRequestedAt: Date | null;
  exitComment: string | null;
  /** In the drawn chain as a receiver (after the draw). */
  inChain: boolean;
  /** Put on «Помощь» by the organizer by hand. */
  backupRequested: boolean;
}

/**
 * Numbers for the organizer's overview. Counts only: no giver, no receiver,
 * no names, so the pairing cannot leak through this page.
 */
export async function getOverview(): Promise<Overview> {
  await requireOrganizer();
  const db = getDb();

  const verified = isNotNull(users.emailVerified);
  const [
    settings,
    eligible,
    eligibleChildren,
    excluded,
    chain,
    chainChildren,
    marked,
    status,
    needed,
    organized,
    exitRequests,
  ] = await Promise.all([
    getSettings(),
    db
      .select({ n: count() })
      .from(participants)
      .innerJoin(users, eq(users.id, participants.userId))
      .where(verified),
    db
      .select({ n: count() })
      .from(participants)
      .innerJoin(users, eq(users.id, participants.userId))
      .where(and(verified, eq(participants.kind, "child"))),
    // Registered accounts that never confirmed their email (they cannot
    // have a profile yet, so counting participants would always give 0).
    db.select({ n: count() }).from(users).where(isNull(users.emailVerified)),
    db.select({ n: count() }).from(assignments),
    db
      .select({ n: count() })
      .from(assignments)
      .innerJoin(participants, eq(participants.id, assignments.receiverId))
      .where(eq(participants.kind, "child")),
    db
      .select({ n: count() })
      .from(assignments)
      .where(isNotNull(assignments.giftLeftAt)),
    broadcastStatuses(EVENTS),
    listBackupNeeded(),
    listBackupOrganized(),
    db
      .select({ n: count() })
      .from(participants)
      .where(isNotNull(participants.exitRequestedAt)),
  ]);

  return {
    phase: getPhase(new Date(), settings),
    participants: settings.drawnAt ? (chain[0]?.n ?? 0) : (eligible[0]?.n ?? 0),
    children: settings.drawnAt
      ? (chainChildren[0]?.n ?? 0)
      : (eligibleChildren[0]?.n ?? 0),
    excluded: excluded[0]?.n ?? 0,
    exitRequests: exitRequests[0]?.n ?? 0,
    giftsMarked: marked[0]?.n ?? 0,
    broadcasts: status,
    backupNeeded: needed.length,
    backupOrganized: organized.length,
  };
}

/**
 * The organizer's table: name, building, flat and email status. No pairs, no
 * addresses beyond building and flat, no email text.
 */
export async function listParticipantRows(): Promise<ParticipantRow[]> {
  await requireOrganizer();
  const rows = await getDb()
    .select({
      id: participants.id,
      name: participants.name,
      kind: participants.kind,
      building: users.building,
      apartment: users.apartment,
      verified: users.emailVerified,
      exitRequestedAt: participants.exitRequestedAt,
      exitComment: participants.exitComment,
      receiverId: assignments.receiverId,
      backupRequestedAt: assignments.backupRequestedAt,
    })
    .from(participants)
    .innerJoin(users, eq(users.id, participants.userId))
    .leftJoin(assignments, eq(assignments.receiverId, participants.id))
    .orderBy(participants.name);
  return rows.map(({ receiverId, backupRequestedAt, verified, ...r }) => ({
    ...r,
    verified: verified !== null,
    inChain: receiverId !== null,
    backupRequested: backupRequestedAt !== null,
  }));
}
