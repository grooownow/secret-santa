import { eq, isNotNull, isNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import { assignments, participants, users } from "@/db/schema";
import { requireOrganizer } from "@/features/auth";
import { getSettings } from "@/features/game";
import { todayInMadrid } from "@/lib/game-time";

export type BackupReason = "noSanta" | "notFound" | "notMarked";

/** One participant who needs a backup Santa. No giver information at all. */
export interface BackupEntry {
  participantId: string;
  name: string;
  building: string | null;
  apartment: string | null;
  reason: BackupReason;
}

async function rows(organized: boolean) {
  return getDb()
    .select({
      participantId: participants.id,
      name: participants.name,
      building: users.building,
      apartment: users.apartment,
      giverId: assignments.giverId,
      notFoundAt: assignments.notFoundAt,
      giftLeftAt: assignments.giftLeftAt,
    })
    .from(assignments)
    .innerJoin(participants, eq(participants.id, assignments.receiverId))
    .innerJoin(users, eq(users.id, participants.userId))
    .where(
      organized
        ? isNotNull(assignments.backupOrganizedAt)
        : isNull(assignments.backupOrganizedAt),
    )
    .orderBy(participants.name);
}

function pick(
  r: Awaited<ReturnType<typeof rows>>[number],
  reveal: boolean,
): BackupEntry | null {
  const reason: BackupReason | null = !r.giverId
    ? "noSanta"
    : r.notFoundAt
      ? "notFound"
      : reveal && !r.giftLeftAt
        ? "notMarked"
        : null;
  if (!reason) return null;
  return {
    participantId: r.participantId,
    name: r.name,
    building: r.building,
    apartment: r.apartment,
    reason,
  };
}

/**
 * Participants who need a backup Santa and have none arranged yet: no Santa
 * after a withdrawal, "gift is not there", and from the reveal day on everyone
 * whose gift was never marked. The payload never contains the giver.
 */
export async function listBackupNeeded(
  now: Date = new Date(),
): Promise<BackupEntry[]> {
  await requireOrganizer();
  const settings = await getSettings();
  const reveal = todayInMadrid(now) >= settings.revealOn;
  return (await rows(false)).flatMap((r) => pick(r, reveal) ?? []);
}

/** Participants whose backup gift the organizer has arranged. */
export async function listBackupOrganized(): Promise<BackupEntry[]> {
  await requireOrganizer();
  return (await rows(true)).map((r) => ({
    participantId: r.participantId,
    name: r.name,
    building: r.building,
    apartment: r.apartment,
    reason: !r.giverId ? "noSanta" : r.notFoundAt ? "notFound" : "notMarked",
  }));
}
