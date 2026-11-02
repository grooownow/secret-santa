"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { requireVerifiedAccount } from "@/features/auth";

const schema = z.boolean();

/** «Могу быть запасным Сантой»: the account's own yes/no. */
export async function setBackupVolunteer(
  value: unknown,
): Promise<{ ok: boolean }> {
  const account = await requireVerifiedAccount();
  const parsed = schema.safeParse(value);
  if (!parsed.success) return { ok: false };
  await getDb()
    .update(users)
    .set({ backupVolunteer: parsed.data })
    .where(eq(users.id, account.id));
  revalidatePath("/home/settings");
  revalidatePath("/admin", "layout");
  return { ok: true };
}
