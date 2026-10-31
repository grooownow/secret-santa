"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { requireUser } from "@/features/auth";

/**
 * Exemplar server action — this is the pattern every generated mutation
 * should copy:
 *
 * 1. `requireUser()` runs FIRST, before we look at the input at all.
 *    Authorization is checked unconditionally so an unauthenticated caller
 *    can't use validation error messages to probe the action's shape.
 * 2. The raw input is validated at the boundary with a `zod` schema via
 *    `safeParse`. Validation failure is expected, user-correctable input —
 *    it returns a typed `{ ok: false, error }` result and never touches
 *    the database.
 * 3. The write goes through Drizzle, scoped to the authenticated user's own
 *    id (never a client-supplied id).
 * 4. `revalidatePath` invalidates the page(s) that read this data so the
 *    UI reflects the change on next render.
 * 5. The result is a typed discriminated union — `{ ok: true }` or
 *    `{ ok: false; error: string }` — so callers get exhaustive
 *    type-checking instead of throw/catch for an expected failure mode.
 *
 * Anything unexpected (a database error, a network blip) is deliberately
 * NOT caught here: it propagates, gets logged by the app's error
 * instrumentation, and is surfaced by the nearest error boundary. Only
 * *validation* failures are modeled as values — everything else is a bug
 * or an outage, not a recoverable input problem.
 */
const nameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(80, "Max 80 characters"),
});

export async function updateName(input: {
  name: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser();

  const parsed = nameSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid name",
    };
  }

  // Note: if the user row was deleted mid-session, this `where` matches zero
  // rows and Drizzle still resolves successfully — we return `ok: true`
  // regardless. Acceptable here because `user.id` comes from the trusted
  // session, not client input; check `result.rowCount` first if your domain
  // needs to distinguish "updated" from "no such row" as a strict error.
  await getDb()
    .update(users)
    .set({ name: parsed.data.name })
    .where(eq(users.id, user.id));

  revalidatePath("/dashboard");

  return { ok: true };
}
