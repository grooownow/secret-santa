import { z } from "zod";
import { LOCALES } from "@/i18n/locale";

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email());

/** bcrypt only looks at the first 72 bytes, so longer passwords are refused. */
export const passwordSchema = z
  .string()
  .min(8)
  .refine((value) => new TextEncoder().encode(value).length <= 72);

export const localeSchema = z.enum(LOCALES);

/** A checked HTML checkbox arrives as "on". */
export const checkedSchema = z.literal("on");
