import { z } from "zod";
import { flatKey, BUILDINGS } from "./apartment";

const name = z.string().trim().min(1).max(60);
const text = z.string().trim().max(1000);

export const adultSchema = z.object({
  name,
  building: z.enum(BUILDINGS),
  apartment: z
    .string()
    .trim()
    .min(1)
    .max(10)
    .refine((value) => flatKey("B", value).length > 2),
  wishes: text,
  avoid: text,
});

export const childSchema = z.object({
  id: z.uuid().optional(),
  name,
  // An empty field must not become 0, so digits are checked as text first.
  age: z
    .string()
    .trim()
    .regex(/^\d{1,2}$/)
    .transform(Number)
    .pipe(z.number().int().min(0).max(17)),
  // Optional: "" (not said) becomes null.
  gender: z
    .enum(["boy", "girl", ""])
    .optional()
    .transform((value) => value || null),
  wishes: text,
  avoid: text,
  guardian: z.literal("on"),
});

export const idSchema = z.uuid();
