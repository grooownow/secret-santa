"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CABINET_PROFILE } from "@/lib/cabinet-routes";
import { getDb } from "@/db/client";
import { participants } from "@/db/schema";
import { requireVerifiedAccount } from "@/features/auth";
import { logger } from "@/lib/logger";
import {
  assertGateOpen,
  canCreate,
  canEdit,
  GateClosedError,
} from "./edit-gate";
import { saveTexts } from "./save-texts";
import { childSchema } from "./schemas";
import type { ProfileState, ProfileValues } from "./state";

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

/**
 * Creates or updates a child's profile (name, age 0-17, wishes, what to
 * avoid). Photos are not allowed for children, so a `photo` field is never
 * read. The guardian's (under 14) or the teen's (14-17) consent is required.
 */
export async function saveChildAction(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const account = await requireVerifiedAccount();
  const values: ProfileValues = {
    name: text(formData, "name"),
    age: text(formData, "age"),
    gender: text(formData, "gender"),
    wishes: text(formData, "wishes"),
    avoid: text(formData, "avoid"),
  };

  const parsed = childSchema.safeParse({
    ...values,
    id: text(formData, "id") || undefined,
    guardian: formData.get("guardian"),
  });
  if (!parsed.success) {
    const consentOnly = parsed.error.issues.every(
      (issue) => issue.path[0] === "guardian",
    );
    return { error: consentOnly ? "consent" : "invalid", values };
  }
  const data = parsed.data;

  const db = getDb();
  const [owner] = await db
    .select({ id: participants.id })
    .from(participants)
    .where(
      and(eq(participants.userId, account.id), eq(participants.kind, "adult")),
    )
    .limit(1);
  if (!owner) return { error: "noOwner", values };

  if (data.id) {
    const [own] = await db
      .select({ id: participants.id })
      .from(participants)
      .where(
        and(
          eq(participants.id, data.id),
          eq(participants.userId, account.id),
          eq(participants.kind, "child"),
        ),
      )
      .limit(1);
    if (!own) return { error: "notFound", values };
    if (!(await canEdit())) return { error: "closed", values };
  } else if (!(await canCreate())) {
    return { error: "closed", values };
  }

  let id: string;
  try {
    id = await db.transaction(async (tx) => {
      await assertGateOpen(tx, data.id ? "edit" : "create");
      if (data.id) {
        await tx
          .update(participants)
          .set({
            name: data.name,
            age: data.age,
            gender: data.gender,
            childConsentAt: new Date(),
            wishes: data.wishes,
            avoid: data.avoid,
          })
          .where(eq(participants.id, data.id));
        return data.id;
      }
      const [created] = await tx
        .insert(participants)
        .values({
          userId: account.id,
          kind: "child",
          name: data.name,
          age: data.age,
          gender: data.gender,
          childConsentAt: new Date(),
          wishes: data.wishes,
          avoid: data.avoid,
        })
        .returning();
      if (!created) throw new Error("participant was not created");
      return created.id;
    });
  } catch (error) {
    if (error instanceof GateClosedError) return { error: "closed", values };
    logger.error({ err: error }, "could not save the child profile");
    return { error: "failed", values };
  }
  await saveTexts(id, data);

  // Tabs are prefetched and kept in the browser (staleTimes): drop that
  // cache so every cabinet tab shows the change.
  revalidatePath("/home", "layout");
  redirect(CABINET_PROFILE);
}
