"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { participants } from "@/db/schema";
import { requireVerifiedAccount } from "@/features/auth";
import { HOME } from "@/features/account";
import { canCreate, canEdit } from "./edit-gate";
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

  let id = data.id;
  if (id) {
    const [own] = await db
      .select({ id: participants.id })
      .from(participants)
      .where(
        and(
          eq(participants.id, id),
          eq(participants.userId, account.id),
          eq(participants.kind, "child"),
        ),
      )
      .limit(1);
    if (!own) return { error: "notFound", values };
    if (!(await canEdit())) return { error: "closed", values };
    await db
      .update(participants)
      .set({
        name: data.name,
        age: data.age,
        childConsentAt: new Date(),
      })
      .where(eq(participants.id, id));
  } else {
    if (!(await canCreate())) return { error: "closed", values };
    const [created] = await db
      .insert(participants)
      .values({
        userId: account.id,
        kind: "child",
        name: data.name,
        age: data.age,
        childConsentAt: new Date(),
      })
      .returning();
    if (!created) return { error: "failed", values };
    id = created.id;
  }
  await saveTexts(id, data);

  redirect(HOME);
}
