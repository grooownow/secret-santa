import { expect, test } from "@playwright/test";

// The e2e server runs with AUTH_DEV_BYPASS=false (playwright.config.ts) and a
// seeded admin (db:reset in the webServer command). These are the env
// defaults; keep them in sync with .env.example if the defaults change.
const EMAIL = "admin@example.local";
const PASSWORD = "dev-admin-pw";

test.describe("credentials login", () => {
  test("seeded admin can sign in and reach the home page", async ({ page }) => {
    await page.goto("/signin");
    await page.getByLabel("Email").fill(EMAIL);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/home(\?|$)/);
  });

  test("email is case- and whitespace-insensitive", async ({ page }) => {
    await page.goto("/signin");
    // Browsers and password managers routinely capitalise the first letter.
    await page.getByLabel("Email").fill(`  ${EMAIL.toUpperCase()}  `);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/home(\?|$)/);
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

  test("unauthenticated /home redirects to /signin", async ({ page }) => {
    await page.goto("/home");
    // Middleware appends ?callbackUrl=...; match the path only.
    await expect(page).toHaveURL(/\/signin(\?|$)/);
    // The sign-in page renders a credentials form, not a dead-end card.
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
  });

  // SPA-navigation gate (spec §5.6-1): internal navigation must stay
  // client-side (<Link>, never a full-page <a href>). The sign-in link on
  // the home page is the first internal navigation target.
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

    // The header link comes first; the hero also has an "Already playing?"
    // sign-in link.
    await page.getByRole("link", { name: "Sign in" }).first().click();
    await expect(page).toHaveURL(/\/signin$/);

    const markerSurvived = await page.evaluate(
      () =>
        (window as unknown as Record<string, boolean>)["__spaMarker"] === true,
    );
    expect(markerSurvived).toBe(true); // full reload would wipe window state
  });
});

test.describe("registration", () => {
  test("register by email lands on the check-email page", async ({ page }) => {
    const email = `new-${Date.now()}@example.com`;
    await page.goto("/register");
    // No Google credentials in the e2e env, so only the email form shows.
    await expect(page.getByTestId("google-button")).toHaveCount(0);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("a-long-password");
    await page.getByLabel(/consent to the processing/i).check();
    await page.getByLabel(/at least 14/i).check();
    await page.getByRole("button", { name: "Sign up" }).click();
    await expect(page).toHaveURL(/\/check-email\?email=/);
    await expect(page.getByText(email).first()).toBeVisible();
  });

  test("register button is blocked until both consents are given", async ({
    page,
  }) => {
    await page.goto("/register");
    await page.getByLabel("Email").fill("x@example.com");
    await page.getByLabel("Password").fill("a-long-password");
    await page.getByLabel(/consent to the processing/i).check();
    await page.getByRole("button", { name: "Sign up" }).click();
    // The browser stops the submit: still on /register.
    await expect(page).toHaveURL(/\/register$/);
  });

  test("forgot password gives the same answer for an unknown email", async ({
    page,
  }) => {
    await page.goto("/forgot-password");
    await page.getByLabel("Email").fill("nobody-here@example.com");
    await page.getByRole("button", { name: "Send link" }).click();
    await expect(
      page.getByText(/if an account with this email/i),
    ).toBeVisible();
  });

  test("an unknown reset link shows the expired state", async ({ page }) => {
    await page.goto("/reset-password?token=nope");
    await expect(page.getByText("This link no longer works")).toBeVisible();
  });
});
