import { test as setup } from "@playwright/test";
import { ORGANISER, PHASES, setDates, signIn } from "./helpers";
import { ORGANISER_STATE } from "./paths";

/**
 * The server starts with the real default dates (sign-ups until 6 Dec 2026),
 * so the suite would turn red by calendar. Before anything else the organiser
 * opens sign-ups relative to today, through the admin Dates screen.
 */
setup("organiser opens sign-ups relative to today", async ({ page }) => {
  await signIn(page, ORGANISER);
  await setDates(page, PHASES.collect);
  await page.context().storageState({ path: ORGANISER_STATE });
});
