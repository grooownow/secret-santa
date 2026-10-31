import { eq, ne } from "drizzle-orm";
import { getDb } from "@/db/client";
import { assignments, guesses, participants, users } from "@/db/schema";
import { getPhase, getSettings } from "@/features/game";
import { getOwnParticipant } from "@/features/profile";

export interface GuessOption {
  id: string;
  name: string;
  building: string | null;
}

export type GuessOptionsResult =
  | { state: "notDrawn" }
  /** Drawn, but this participant is not in the draw (joined later). */
  | { state: "notInDraw" }
  | {
      state: "ready";
      /** Only name and building: no apartment, no photo, no giver info. */
      options: GuessOption[];
      guessedId: string | null;
    };

/**
 * The list a participant guesses from: everyone in the draw except the
 * participants of the guesser's own account. Returns `null` when the
 * participant is not the account's own. The list is the same for everyone and
 * says nothing about who the real Santa is.
 */
export async function listGuessOptions(
  userId: string,
  participantId: string,
): Promise<GuessOptionsResult | null> {
  const own = await getOwnParticipant(userId, participantId);
  if (!own) return null;
  if (!(await getSettings()).drawnAt) return { state: "notDrawn" };

  const db = getDb();
  const [mine] = await db
    .select({ receiverId: assignments.receiverId })
    .from(assignments)
    .where(eq(assignments.receiverId, participantId))
    .limit(1);
  if (!mine) return { state: "notInDraw" };

  const options = await db
    .select({
      id: participants.id,
      name: participants.name,
      building: users.building,
    })
    .from(assignments)
    .innerJoin(participants, eq(participants.id, assignments.receiverId))
    .innerJoin(users, eq(users.id, participants.userId))
    .where(ne(participants.userId, userId))
    .orderBy(participants.name);

  const [guess] = await db
    .select({ guessedId: guesses.guessedId })
    .from(guesses)
    .where(eq(guesses.participantId, participantId))
    .limit(1);
  return { state: "ready", options, guessedId: guess?.guessedId ?? null };
}

export type RevealResult =
  | { state: "notInDraw" }
  | {
      state: "ready";
      santa: { name: string; building: string | null } | "backup";
      /** `null` when there was no guess or the Santa is the backup one. */
      guessCorrect: boolean | null;
      /** Whom the participant guessed; `null` as for `guessCorrect`. */
      guessedName: string | null;
    };

/**
 * The reveal for one of the account's participants. `null` (a 404) for a
 * foreign participant and for every date before `revealOn`: this is the only
 * query that returns the giver, and it never does so earlier.
 */
export async function getReveal(
  userId: string,
  participantId: string,
  now: Date = new Date(),
): Promise<RevealResult | null> {
  const own = await getOwnParticipant(userId, participantId);
  if (!own) return null;
  const settings = await getSettings();
  const phase = getPhase(now, settings);
  if (phase !== "reveal" && phase !== "closed") return null;

  const db = getDb();
  const [row] = await db
    .select({
      giverId: assignments.giverId,
      backupOrganizedAt: assignments.backupOrganizedAt,
    })
    .from(assignments)
    .where(eq(assignments.receiverId, participantId))
    .limit(1);
  if (!row) return { state: "notInDraw" };
  if (!row.giverId || row.backupOrganizedAt) {
    return {
      state: "ready",
      santa: "backup",
      guessCorrect: null,
      guessedName: null,
    };
  }

  const [giver] = await db
    .select({ name: participants.name, building: users.building })
    .from(participants)
    .innerJoin(users, eq(users.id, participants.userId))
    .where(eq(participants.id, row.giverId))
    .limit(1);
  if (!giver) {
    return {
      state: "ready",
      santa: "backup",
      guessCorrect: null,
      guessedName: null,
    };
  }

  const [guess] = await db
    .select({ guessedId: guesses.guessedId, name: participants.name })
    .from(guesses)
    .innerJoin(participants, eq(participants.id, guesses.guessedId))
    .where(eq(guesses.participantId, participantId))
    .limit(1);
  return {
    state: "ready",
    santa: giver,
    guessCorrect: guess ? guess.guessedId === row.giverId : null,
    guessedName: guess?.name ?? null,
  };
}
