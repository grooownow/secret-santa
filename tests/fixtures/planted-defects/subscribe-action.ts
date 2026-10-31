// PLANTED DEFECT — see tests/fixtures/planted-defects/ground-truth.json (D1).
// Do not "fix" this file. It is the input to the review skill's detection eval.
"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { requireUser } from "@/features/auth";

/**
 * Starts a paid subscription for the signed-in user.
 *
 * Authorization is checked first, the write is scoped to the session's own
 * user id, and the result is the usual typed union — so everything about this
 * action looks like `src/features/profile/update-name-action.ts` except the one
 * thing that matters.
 */
export async function subscribe(input: {
  plan: string;
  seats: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser();

  // DEFECT (D1): raw, unvalidated input straight from the client goes into the
  // database. No zod schema, no safeParse — `plan` could be any string and
  // `seats` any number, including negative.
  await getDb()
    .update(users)
    .set({ name: `${input.plan}:${input.seats}` })
    .where(eq(users.id, user.id));

  revalidatePath("/dashboard");

  return { ok: true };
}
