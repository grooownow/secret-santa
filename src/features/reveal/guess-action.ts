"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db/client";
import { assignments, guesses, participants, settings } from "@/db/schema";
import { requireVerifiedAccount } from "@/features/auth";
import { canGuess } from "@/features/game";
import { getOwnParticipant } from "@/features/profile";
import { DEFAULT_DATES } from "@/lib/game-phase";
import { guessPath } from "@/lib/cabinet-routes";
import { logger } from "@/lib/logger";
import { saveGuessSchema } from "./schemas";

export interface GuessState {
  saved?: boolean;
  error?: "invalid" | "notFound" | "closed" | "failed";
}

class Rejected extends Error {
  code: "invalid" | "closed" = "invalid";
}

function reject(code: "invalid" | "closed"): Rejected {
  const error = new Rejected(code);
  error.code = code;
  return error;
}

/**
 * Saves or changes a guess until the end of 31 December. The answer never
 * depends on who the real Santa is: it is `saved` or an error that is the same
 * for every participant, so a guess cannot be probed before the reveal.
 */
export async function saveGuess(input: unknown): Promise<GuessState> {
  const account = await requireVerifiedAccount();
  const parsed = saveGuessSchema.safeParse(input);
  if (!parsed.success) return { error: "invalid" };
  const { participantId, guessedId } = parsed.data;

  const own = await getOwnParticipant(account.id, participantId);
  if (!own) return { error: "notFound" };

  try {
    await getDb().transaction(async (tx) => {
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
      if (!canGuess(new Date(), gate)) throw reject("closed");

      // Guesser and guessed must both be in the draw; the guessed one must
      // belong to another account (same rule as the list of options).
      const [mine] = await tx
        .select({ id: assignments.receiverId })
        .from(assignments)
        .where(eq(assignments.receiverId, participantId))
        .limit(1);
      const [target] = await tx
        .select({ userId: participants.userId })
        .from(assignments)
        .innerJoin(participants, eq(participants.id, assignments.receiverId))
        .where(eq(assignments.receiverId, guessedId))
        .limit(1);
      if (!mine || !target || target.userId === account.id) {
        throw reject("invalid");
      }

      await tx
        .insert(guesses)
        .values({ participantId, guessedId })
        .onConflictDoUpdate({
          target: guesses.participantId,
          set: { guessedId },
        });
    });
  } catch (error) {
    if (error instanceof Rejected) return { error: error.code };
    logger.error({ err: error }, "could not save the guess");
    return { error: "failed" };
  }

  revalidatePath(guessPath(participantId));
  return { saved: true };
}
