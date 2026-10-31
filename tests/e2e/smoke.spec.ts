import { expect, test } from "@playwright/test";

test.describe("golden path smoke", () => {
  test("home renders in the language of the browser and is noindex", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: "Secret Santa for Bialto neighbours" }),
    ).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      "noindex, nofollow",
    );
    await expect(
      page.getByRole("link", { name: "ludvik4.dev" }),
    ).toHaveAttribute("target", "_blank");
  });

  test("language switcher stores the choice in a cookie", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Choose a language").click();
    await page.getByRole("button", { name: /Deutsch/ }).click();

    await expect(page.locator("html")).toHaveAttribute("lang", "de");
    await expect(
      page.getByRole("heading", {
        name: "Wichteln für die Nachbarschaft in Bialto",
      }),
    ).toBeVisible();
  });

  test("unknown route renders the not-found page", async ({ page }) => {
    await page.goto("/nonexistent");

    await expect(
      page.getByRole("heading", { name: "Page not found" }),
    ).toBeVisible();
  });

  test("landing footer: organizer, author block and the rules link", async ({
    page,
  }) => {
    await page.goto("/");
    const footer = page.getByRole("contentinfo");

    await expect(footer).toContainText(
      "Game organizer: Kate, write on Telegram.",
    );
    await expect(footer.getByText("Made by — Ludvik4")).toBeVisible();
    for (const [name, href] of [
      ["write on Telegram", "https://t.me/ludvik4"],
      ["t.me/ludvik4", "https://t.me/ludvik4"],
      ["Threads", "https://www.threads.com/@ludvik.coffee"],
      ["ludvik4.dev", "https://ludvik4.dev/"],
    ] as const) {
      const link = footer.getByRole("link", { name, exact: true });
      await expect(link).toHaveAttribute("href", href);
      await expect(link).toHaveAttribute("target", "_blank");
    }
    await expect(footer).not.toContainText("RU · UA · EN · ES · DE");

    await footer.getByRole("link", { name: "Rules and data" }).click();
    await expect(page).toHaveURL(/\/rules$/);
  });
});
