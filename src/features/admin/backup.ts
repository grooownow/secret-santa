import { and, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import { assignments, participants, users } from "@/db/schema";
import { requireOrganizer } from "@/features/auth";
import { getSettings } from "@/features/game";
import { flatKey } from "@/features/profile";
import { todayInMadrid } from "@/lib/game-time";

export type BackupReason = "noSanta" | "notFound" | "notMarked" | "manual";

/** One participant who needs a backup Santa. No giver information at all. */
export interface BackupEntry {
  participantId: string;
  name: string;
  building: string | null;
  apartment: string | null;
  reason: BackupReason;
  /** The account of this receiver (a volunteer must not be from it). */
  userId: string;
  /** The volunteer asked to prepare this gift, by their name. */
  volunteer: { userId: string; name: string } | null;
}

async function rows(organized: boolean) {
  return getDb()
    .select({
      participantId: participants.id,
      userId: participants.userId,
      name: participants.name,
      building: users.building,
      apartment: users.apartment,
      giverId: assignments.giverId,
      notFoundAt: assignments.notFoundAt,
      giftLeftAt: assignments.giftLeftAt,
      backupRequestedAt: assignments.backupRequestedAt,
      backupVolunteerId: assignments.backupVolunteerId,
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

type Row = Awaited<ReturnType<typeof rows>>[number];

/** Volunteer accounts by id → the name of their adult participant. */
async function volunteerNames(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const found = await getDb()
    .select({ userId: participants.userId, name: participants.name })
    .from(participants)
    .where(
      and(inArray(participants.userId, ids), eq(participants.kind, "adult")),
    );
  return new Map(found.map((f) => [f.userId, f.name]));
}

function entry(
  r: Row,
  reason: BackupReason,
  names: Map<string, string>,
): BackupEntry {
  return {
    participantId: r.participantId,
    userId: r.userId,
    name: r.name,
    building: r.building,
    apartment: r.apartment,
    reason,
    volunteer: r.backupVolunteerId
      ? {
          userId: r.backupVolunteerId,
          name: names.get(r.backupVolunteerId) ?? "—",
        }
      : null,
  };
}

function reasonOf(r: Row, reveal: boolean): BackupReason | null {
  return !r.giverId
    ? "noSanta"
    : r.notFoundAt
      ? "notFound"
      : r.backupRequestedAt
        ? "manual"
        : reveal && !r.giftLeftAt
          ? "notMarked"
          : null;
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
  const all = await rows(false);
  const names = await volunteerNames(
    all.flatMap((r) => (r.backupVolunteerId ? [r.backupVolunteerId] : [])),
  );
  return all.flatMap((r) => {
    const reason = reasonOf(r, reveal);
    return reason ? [entry(r, reason, names)] : [];
  });
}

/** Participants whose backup gift the organizer has arranged. */
export async function listBackupOrganized(): Promise<BackupEntry[]> {
  await requireOrganizer();
  const all = await rows(true);
  const names = await volunteerNames(
    all.flatMap((r) => (r.backupVolunteerId ? [r.backupVolunteerId] : [])),
  );
  return all.map((r) => entry(r, reasonOf(r, true) ?? "notMarked", names));
}

/** A volunteer the organizer can ask: account, adult name and flat. */
export interface Volunteer {
  userId: string;
  name: string;
  building: string | null;
  apartment: string | null;
}

/** Accounts that ticked «Могу быть запасным Сантой», with their adult. */
export async function listVolunteers(): Promise<Volunteer[]> {
  await requireOrganizer();
  return getDb()
    .select({
      userId: users.id,
      name: participants.name,
      building: users.building,
      apartment: users.apartment,
    })
    .from(users)
    .innerJoin(
      participants,
      and(eq(participants.userId, users.id), eq(participants.kind, "adult")),
    )
    .where(eq(users.backupVolunteer, true))
    .orderBy(participants.name);
}

/**
 * Volunteers who may help this receiver: not their own account, not their
 * flat (the same rule as the draw). Used by the page and by assignVolunteer.
 */
export function eligibleVolunteers(
  target: Pick<BackupEntry, "userId" | "building" | "apartment">,
  volunteers: Volunteer[],
): Volunteer[] {
  const flat =
    target.building && target.apartment
      ? flatKey(target.building, target.apartment)
      : null;
  return volunteers.filter(
    (v) =>
      v.userId !== target.userId &&
      !(
        flat &&
        v.building &&
        v.apartment &&
        flatKey(v.building, v.apartment) === flat
      ),
  );
}
