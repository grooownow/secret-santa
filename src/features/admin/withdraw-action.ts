"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireOrganizer } from "@/features/auth";
import { ADMIN_PARTICIPANTS } from "./routes";
import { withdrawParticipant, type WithdrawResult } from "./withdraw";

const idSchema = z.uuid();

/**
 * Organizer-only: removes an application (collect) or withdraws a participant
 * (draw to 24 December). Refused from 25 December. Returns the refusal; on
 * success goes back to the table.
 */
export async function withdrawAction(
  id: unknown,
): Promise<Extract<WithdrawResult, { ok: false }>> {
  await requireOrganizer();
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return { ok: false, reason: "notFound" };
  const result = await withdrawParticipant(parsed.data);
  if (!result.ok) return result;
  revalidatePath("/admin", "layout");
  redirect(ADMIN_PARTICIPANTS);
}
