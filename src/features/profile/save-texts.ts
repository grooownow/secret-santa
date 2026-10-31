import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { participants, users } from "@/db/schema";
import { isLocale } from "@/i18n/locale";
import { participantKey, scheduleTranslation } from "@/features/translation";

export interface ParticipantTexts {
  wishes: string;
  avoid: string;
}

/**
 * The one place where a participant's free texts (wishes, what to avoid) are
 * written. Translations in the other four languages are made here, after the
 * response; only the texts are sent, never the name or address. A translation
 * problem never fails the save.
 */
export async function saveTexts(
  participantId: string,
  texts: ParticipantTexts,
): Promise<void> {
  await getDb()
    .update(participants)
    .set({ wishes: texts.wishes, avoid: texts.avoid })
    .where(eq(participants.id, participantId));

  const [author] = await getDb()
    .select({ locale: users.locale })
    .from(participants)
    .innerJoin(users, eq(users.id, participants.userId))
    .where(eq(participants.id, participantId))
    .limit(1);
  const locale = isLocale(author?.locale) ? author.locale : "en";
  await scheduleTranslation(
    participantKey(participantId, "wishes"),
    texts.wishes,
    locale,
  );
  await scheduleTranslation(
    participantKey(participantId, "avoid"),
    texts.avoid,
    locale,
  );
}
