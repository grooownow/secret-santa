import { expect, test } from "@playwright/test";

test.describe("golden path smoke", () => {
  test("home renders in the language of the browser and is noindex", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: "Secret Santa Bialto" }),
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
      page.getByRole("heading", { name: "Wichteln Bialto" }),
    ).toBeVisible();
  });

  test("unknown route renders the not-found page", async ({ page }) => {
    await page.goto("/nonexistent");

    await expect(
      page.getByRole("heading", { name: "Page not found" }),
    ).toBeVisible();
  });
});
