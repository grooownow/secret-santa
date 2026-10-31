import { expect, test } from "@playwright/test";

// The e2e server runs with AUTH_DEV_BYPASS=false (playwright.config.ts) and a
// seeded admin (db:reset in the webServer command). These are the env
// defaults; keep them in sync with .env.example if the defaults change.
const EMAIL = "admin@example.local";
const PASSWORD = "dev-admin-pw";

test.describe("credentials login", () => {
  test("seeded admin can sign in and reach the dashboard", async ({ page }) => {
    await page.goto("/signin");
    await page.getByLabel("Email").fill(EMAIL);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/dashboard(\?|$)/);
  });

  test("email is case- and whitespace-insensitive", async ({ page }) => {
    await page.goto("/signin");
    // Browsers and password managers routinely capitalise the first letter.
    await page.getByLabel("Email").fill(`  ${EMAIL.toUpperCase()}  `);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/dashboard(\?|$)/);
  });

  test("wrong password stays on /signin and shows an error", async ({
    page,
  }) => {
    await page.goto("/signin");
    await page.getByLabel("Email").fill(EMAIL);
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/signin(\?|$)/);
    // The error is surfaced under the form. (Target the text rather than
    // role=alert, which also matches Next's route announcer.)
    await expect(page.getByText(/invalid email or password/i)).toBeVisible();
    // The email the user typed is preserved.
    await expect(page.getByLabel("Email")).toHaveValue(EMAIL);
  });

  test("unauthenticated /dashboard redirects to /signin", async ({ page }) => {
    await page.goto("/dashboard");
    // Middleware appends ?callbackUrl=...; match the path only.
    await expect(page).toHaveURL(/\/signin(\?|$)/);
    // The sign-in page renders a credentials form, not a dead-end card.
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
  });

  // SPA-navigation gate (spec §5.6-1): internal navigation must stay
  // client-side (<Link>, never a full-page <a href>). This lives with the
  // persistence module because Landing has no internal links to navigate —
  // the sign-in link on the landing page (re-added by this module) is the
  // first internal navigation target.
  test("SPA-navigation gate: Link navigation stays client-side", async ({
    page,
  }) => {
    await page.goto("/");

    // A full page reload wipes in-memory window state; client-side (SPA)
    // navigation preserves it. This is a reliable signal, unlike
    // performance.getEntriesByType("navigation").length, which reports
    // exactly 1 for both SPA and full-reload navigations and is therefore
    // vacuous as a gate.
    await page.evaluate(() => {
      (window as unknown as Record<string, boolean>)["__spaMarker"] = true;
    });

    await page.getByRole("link", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/signin$/);

    const markerSurvived = await page.evaluate(
      () =>
        (window as unknown as Record<string, boolean>)["__spaMarker"] === true,
    );
    expect(markerSurvived).toBe(true); // full reload would wipe window state
  });
});
