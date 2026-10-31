"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireOrganizer } from "@/features/auth";
import { ADMIN_PARTICIPANTS } from "./routes";
import {
  notifyAccount,
  withdrawParticipant,
  type Unnotified,
  type WithdrawResult,
} from "./withdraw";

const idSchema = z.uuid();

/**
 * Organizer-only: removes an application (collect) or withdraws a participant
 * (draw to 24 December). Refused from 25 December. Returns the refusal, or
 * the givers who could not be mailed; otherwise goes back to the table.
 */
export async function withdrawAction(id: unknown): Promise<WithdrawResult> {
  await requireOrganizer();
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return { ok: false, reason: "notFound" };
  const result = await withdrawParticipant(parsed.data);
  // No revalidation on this branch: a refresh would unmount the page that
  // shows the unsent-mail warning. The organizer leaves through the notice.
  if (!result.ok || result.unnotified.length > 0) return result;
  revalidatePath("/admin", "layout");
  redirect(ADMIN_PARTICIPANTS);
}

const retrySchema = z.array(
  z.object({
    userId: z.uuid(),
    giverIds: z.array(z.uuid()).min(1).max(100),
    at: z.number().int().positive(),
  }),
);

/**
 * "Отправить ещё раз": retries the mails that failed after a withdrawal.
 * Safe to repeat, the mail key is claimed first. Returns what still failed.
 */
export async function retryNotify(
  items: unknown,
): Promise<{ ok: true; failed: Unnotified[] } | { ok: false }> {
  await requireOrganizer();
  const parsed = retrySchema.safeParse(items);
  if (!parsed.success) return { ok: false };
  const failed: Unnotified[] = [];
  for (const item of parsed.data) {
    try {
      // oxlint-disable-next-line no-await-in-loop
      await notifyAccount(item.userId, item.giverIds, item.at);
    } catch {
      failed.push(item);
    }
  }
  return { ok: true, failed };
}
