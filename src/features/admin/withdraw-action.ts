"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireOrganizer } from "@/features/auth";
import { openRetry, sealRetry } from "./retry-token";
import { ADMIN_PARTICIPANTS } from "./routes";
import {
  notifyAccount,
  withdrawParticipant,
  type Unnotified,
} from "./withdraw";

const idSchema = z.uuid();

/**
 * What the organizer's browser gets back. Unsent mails travel only as a count
 * and an opaque, encrypted token: the account and participant ids inside
 * would reveal who was the withdrawn person's Santa.
 */
export type WithdrawActionResult =
  | { ok: true; removed: number; unnotified: number; retryToken: string }
  | { ok: false; reason: "notFound" | "closed" };

export type RetryResult =
  { ok: true; left: number; retryToken: string | null } | { ok: false };

/**
 * Organizer-only: removes an application (collect) or withdraws a participant
 * (draw to 24 December). Refused from 25 December. Returns the refusal, or
 * the count of givers who could not be mailed; otherwise goes back to the
 * table.
 */
export async function withdrawAction(
  id: unknown,
): Promise<WithdrawActionResult> {
  await requireOrganizer();
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return { ok: false, reason: "notFound" };
  const result = await withdrawParticipant(parsed.data);
  if (!result.ok) return result;
  // No revalidation on this branch: a refresh would unmount the page that
  // shows the unsent-mail warning. The organizer leaves through the notice.
  if (result.unnotified.length > 0) {
    return {
      ok: true,
      removed: result.removed,
      unnotified: result.unnotified.length,
      retryToken: sealRetry(result.unnotified),
    };
  }
  revalidatePath("/admin", "layout");
  redirect(ADMIN_PARTICIPANTS);
}

const retrySchema = z.string().min(1).max(20_000);

/**
 * "Отправить ещё раз": retries the mails that failed after a withdrawal.
 * Safe to repeat, the mail key is claimed first. Returns how many still
 * failed, with a new token for them.
 */
export async function retryNotify(token: unknown): Promise<RetryResult> {
  await requireOrganizer();
  const parsed = retrySchema.safeParse(token);
  if (!parsed.success) return { ok: false };
  const items = openRetry(parsed.data);
  if (!items) return { ok: false };
  const failed: Unnotified[] = [];
  for (const item of items) {
    try {
      // oxlint-disable-next-line no-await-in-loop
      await notifyAccount(item.userId, item.giverIds, item.at);
    } catch {
      failed.push(item);
    }
  }
  return {
    ok: true,
    left: failed.length,
    retryToken: failed.length ? sealRetry(failed) : null,
  };
}
