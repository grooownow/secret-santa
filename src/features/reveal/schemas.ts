import { z } from "zod";

export const saveGuessSchema = z.object({
  participantId: z.uuid(),
  guessedId: z.uuid(),
});
