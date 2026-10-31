import { getPhase, getSettings, registrationOpen } from "@/features/game";

/**
 * Profiles can be created while registration is open and changed or deleted
 * during the collect phase only (spec, "Анкета").
 */
export async function canCreate(): Promise<boolean> {
  return registrationOpen(new Date(), await getSettings());
}

export async function canEdit(): Promise<boolean> {
  return getPhase(new Date(), await getSettings()) === "collect";
}
