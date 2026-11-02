"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { requireVerifiedAccount } from "@/features/auth";
import {
  CABINET_GIFT,
  CABINET_HOME,
  CABINET_PROFILE,
} from "@/lib/cabinet-routes";
import { rememberParticipant } from "./current-participant";

const switchSchema = z.object({
  participantId: z.uuid(),
  to: z.enum(["home", "gift", "profile"]),
});

const TARGET = {
  home: CABINET_HOME,
  gift: CABINET_GIFT,
  profile: CABINET_PROFILE,
} as const;

/**
 * Makes another participant of the account the active one, then returns to
 * the tab the choice was made from. A POST on purpose: the old GET link set
 * the cookie, and Next's link prefetch could switch the participant without a
 * tap. Someone else's or a malformed id is a plain 404.
 */
export async function switchParticipantAction(formData: FormData) {
  const account = await requireVerifiedAccount();
  const input = switchSchema.safeParse({
    participantId: formData.get("participantId"),
    to: formData.get("to"),
  });
  if (
    !input.success ||
    !(await rememberParticipant(account.id, input.data.participantId))
  ) {
    notFound();
  }
  // Tabs are prefetched and kept in the browser (staleTimes): drop that
  // cache so every cabinet tab shows the change.
  revalidatePath("/home", "layout");
  redirect(TARGET[input.data.to]);
}
