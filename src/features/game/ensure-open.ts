import { redirect } from "next/navigation";
import { getPhase } from "./phase";
import { getSettings } from "./settings";

/** Sends every visitor to `/closed` once the game has ended. */
export async function redirectIfClosed(now: Date = new Date()): Promise<void> {
  if (getPhase(now, await getSettings()) === "closed") {
    redirect("/closed");
  }
}
