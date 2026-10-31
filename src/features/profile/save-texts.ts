import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { participants } from "@/db/schema";

export interface ParticipantTexts {
  wishes: string;
  avoid: string;
}

/**
 * The one place where a participant's free texts (wishes, what to avoid) are
 * written. The automatic translation of these texts hooks in here.
 */
export async function saveTexts(
  participantId: string,
  texts: ParticipantTexts,
): Promise<void> {
  await getDb()
    .update(participants)
    .set({ wishes: texts.wishes, avoid: texts.avoid })
    .where(eq(participants.id, participantId));
}
