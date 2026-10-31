import { z } from "zod";

/** A real calendar day as `YYYY-MM-DD`. */
const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return (
      !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
    );
  });

export const DATE_FIELDS = [
  "applicationsCloseOn",
  "drawOn",
  "giftsStartOn",
  "giftsEndOn",
  "revealOn",
  "closeOn",
] as const;
export type DateField = (typeof DATE_FIELDS)[number];

export const datesSchema = z.object({
  applicationsCloseOn: day,
  drawOn: day,
  giftsStartOn: day,
  giftsEndOn: day,
  revealOn: day,
  closeOn: day,
});
export type Dates = z.infer<typeof datesSchema>;

/**
 * Dates must follow the game's order: applications close, draw, gifts start,
 * gifts end, reveal, close. Days compare as strings (see game-phase).
 */
export function datesInOrder(d: Dates): boolean {
  return (
    d.applicationsCloseOn <= d.drawOn &&
    d.drawOn < d.giftsStartOn &&
    d.giftsStartOn <= d.giftsEndOn &&
    d.giftsEndOn < d.revealOn &&
    d.revealOn < d.closeOn
  );
}
