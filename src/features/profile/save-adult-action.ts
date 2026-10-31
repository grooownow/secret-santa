"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { participants, users } from "@/db/schema";
import { requireVerifiedAccount } from "@/features/auth";
import { HOME } from "@/features/account";
import { renderEmail, sendOnce } from "@/features/mail";
import { isLocale } from "@/i18n/locale";
import { logger } from "@/lib/logger";
import { deletePhotos } from "@/lib/photo-storage";
import { runAfterResponse } from "@/lib/run-after-response";
import {
  assertGateOpen,
  canCreate,
  canEdit,
  GateClosedError,
} from "./edit-gate";
import { readPhoto } from "./photo-field";
import { saveTexts } from "./save-texts";
import { adultSchema } from "./schemas";
import type { ProfileState, ProfileValues } from "./state";

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

/**
 * Creates or updates the owner's own profile (adult or teen 14+): name,
 * building, flat, optional photo, wishes and what to avoid. The first save
 * sends the "application accepted" email, once per account.
 */
export async function saveAdultAction(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const account = await requireVerifiedAccount();
  const values: ProfileValues = {
    name: text(formData, "name"),
    building: text(formData, "building"),
    apartment: text(formData, "apartment"),
    wishes: text(formData, "wishes"),
    avoid: text(formData, "avoid"),
  };

  const parsed = adultSchema.safeParse(values);
  if (!parsed.success) return { error: "invalid", values };
  const data = parsed.data;

  const db = getDb();
  const [existing] = await db
    .select()
    .from(participants)
    .where(
      and(eq(participants.userId, account.id), eq(participants.kind, "adult")),
    )
    .limit(1);
  if (!(existing ? await canEdit() : await canCreate())) {
    return { error: "closed", values };
  }

  const photo = await readPhoto(formData);
  if (photo.kind === "error") return { error: photo.error, values };

  let photoUrl = existing?.photoUrl ?? null;
  if (photo.kind === "new") photoUrl = photo.url;
  else if (text(formData, "removePhoto") === "on") photoUrl = null;

  let id: string;
  try {
    id = await db.transaction(async (tx) => {
      await assertGateOpen(tx, existing ? "edit" : "create");
      await tx
        .update(users)
        .set({ building: data.building, apartment: data.apartment })
        .where(eq(users.id, account.id));
      if (existing) {
        await tx
          .update(participants)
          .set({
            name: data.name,
            photoUrl,
            wishes: data.wishes,
            avoid: data.avoid,
          })
          .where(eq(participants.id, existing.id));
        return existing.id;
      }
      const [created] = await tx
        .insert(participants)
        .values({
          userId: account.id,
          kind: "adult",
          name: data.name,
          photoUrl,
          wishes: data.wishes,
          avoid: data.avoid,
        })
        .returning();
      if (!created) throw new Error("participant was not created");
      return created.id;
    });
  } catch (error) {
    if (photo.kind === "new") await deletePhotos([photo.url]).catch(() => {});
    if (error instanceof GateClosedError) return { error: "closed", values };
    logger.error({ err: error }, "could not save the owner profile");
    return { error: "failed", values };
  }
  await saveTexts(id, data);

  if (existing?.photoUrl && existing.photoUrl !== photoUrl) {
    await deletePhotos([existing.photoUrl]).catch((error: unknown) =>
      logger.error({ err: error }, "could not delete the old photo"),
    );
  }

  if (!existing) {
    const locale = isLocale(account.locale) ? account.locale : "en";
    runAfterResponse(async () => {
      try {
        const mail = renderEmail("application", locale, { names: [data.name] });
        await sendOnce(`application:${account.id}`, {
          to: account.email,
          ...mail,
        });
      } catch (error) {
        logger.error({ err: error }, "could not send the application email");
      }
    });
  }

  redirect(HOME);
}
