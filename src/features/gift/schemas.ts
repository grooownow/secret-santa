import { z } from "zod";

export const NOTE_MAX = 200;
export const CODE_MAX = 50;

/** Empty strings from the form become `null`. */
const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : null));

export const markGiftSchema = z.object({
  participantId: z.uuid(),
  place: z.enum(["locker", "mailbox"]),
  code: optional(CODE_MAX),
  note: optional(NOTE_MAX),
});

export const participantIdSchema = z.uuid();
