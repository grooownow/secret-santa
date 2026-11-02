import { eq, or } from "drizzle-orm";
import { getDb } from "@/db/client";
import { assignments, participants, users } from "@/db/schema";
import { getSettings } from "@/features/game";
import { getOwnParticipant } from "@/features/profile";
import { isLocale, type Locale } from "@/i18n/locale";

export interface RecipientInfo {
  id: string;
  name: string;
  kind: "adult" | "child";
  age: number | null;
  /** Children only, optional: helps the Santa choose. */
  gender: "boy" | "girl" | null;
  building: string | null;
  apartment: string | null;
  photoUrl: string | null;
  wishes: string;
  avoid: string;
  /** Language the recipient wrote the texts in (their interface language). */
  sourceLocale: Locale;
}

export interface GiverGift {
  place: "locker" | "mailbox" | null;
  note: string | null;
  leftAt: Date | null;
  version: number;
}

/** Whether the participant appears in the draw result in either role. */
async function inDraw(participantId: string): Promise<boolean> {
  const [row] = await getDb()
    .select({ receiverId: assignments.receiverId })
    .from(assignments)
    .where(
      or(
        eq(assignments.receiverId, participantId),
        eq(assignments.giverId, participantId),
      ),
    )
    .limit(1);
  return !!row;
}

export type RecipientResult =
  | { state: "notDrawn" }
  /** Drawn, but nobody is left to give to (after a drop-out). */
  | { state: "none" }
  /** Drawn, but this participant is not in the draw at all (joined later). */
  | { state: "notInDraw" }
  | {
      state: "ready";
      recipient: RecipientInfo;
      /** The recipient changed after a drop-out. */
      reassigned: boolean;
      gift: GiverGift;
    };

/**
 * The recipient of one of the account's participants, with the address and
 * photo. Returns `null` when the participant is not the account's own: this is
 * the only place that reads the recipient's address and photo, and it matches
 * on the *current* giver, so a former giver sees nothing.
 */
export async function getRecipient(
  userId: string,
  participantId: string,
): Promise<RecipientResult | null> {
  const own = await getOwnParticipant(userId, participantId);
  if (!own) return null;
  if (!(await getSettings()).drawnAt) return { state: "notDrawn" };

  const [row] = await getDb()
    .select({
      recipient: participants,
      assignment: assignments,
      building: users.building,
      apartment: users.apartment,
      locale: users.locale,
    })
    .from(assignments)
    .innerJoin(participants, eq(participants.id, assignments.receiverId))
    .innerJoin(users, eq(users.id, participants.userId))
    .where(eq(assignments.giverId, participantId))
    .limit(1);
  if (!row) {
    return (await inDraw(participantId))
      ? { state: "none" }
      : { state: "notInDraw" };
  }

  const { recipient, assignment } = row;
  return {
    state: "ready",
    recipient: {
      id: recipient.id,
      name: recipient.name,
      kind: recipient.kind,
      age: recipient.age,
      gender: recipient.gender,
      building: row.building,
      apartment: row.apartment,
      photoUrl: recipient.photoUrl,
      wishes: recipient.wishes,
      avoid: recipient.avoid,
      sourceLocale: isLocale(row.locale) ? row.locale : "en",
    },
    reassigned: assignment.reassignedAt !== null,
    gift: {
      place: assignment.giftPlace,
      note: assignment.giftNote,
      leftAt: assignment.giftLeftAt,
      version: assignment.giftVersion,
    },
  };
}

export type GiftStatus = "waiting" | "left" | "notFound";

export type MyGiftResult =
  | { state: "notDrawn" }
  | { state: "notInDraw" }
  | {
      state: "ready";
      status: GiftStatus;
      place: "locker" | "mailbox" | null;
      note: string | null;
      leftAt: Date | null;
    };

/**
 * The gift that waits for one of the account's participants. Never contains
 * the giver's id or name: the giver stays anonymous until the reveal.
 */
export async function getMyGift(
  userId: string,
  participantId: string,
): Promise<MyGiftResult | null> {
  const own = await getOwnParticipant(userId, participantId);
  if (!own) return null;

  const [row] = await getDb()
    .select({
      giftPlace: assignments.giftPlace,
      giftNote: assignments.giftNote,
      giftLeftAt: assignments.giftLeftAt,
      notFoundAt: assignments.notFoundAt,
    })
    .from(assignments)
    .where(eq(assignments.receiverId, participantId))
    .limit(1);
  if (!row) {
    return (await getSettings()).drawnAt
      ? { state: "notInDraw" }
      : { state: "notDrawn" };
  }

  const left = row.giftLeftAt !== null;
  return {
    state: "ready",
    status: !left ? "waiting" : row.notFoundAt ? "notFound" : "left",
    place: row.giftPlace,
    note: row.giftNote,
    leftAt: row.giftLeftAt,
  };
}
