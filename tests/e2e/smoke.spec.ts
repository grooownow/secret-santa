import { expect, test } from "@playwright/test";

test.describe("golden path smoke", () => {
  test("home renders headline and theme toggle flips dark mode", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page.getByText("Gridfin", { exact: true })).toBeVisible();

    const html = page.locator("html");
    const toggle = page.getByRole("button", { name: "Toggle theme" });

    await expect(html).not.toHaveClass(/dark/);
    await toggle.click();
    await expect(html).toHaveClass(/dark/);
    await toggle.click();
    await expect(html).not.toHaveClass(/dark/);
  });

  test("unknown route renders the not-found page", async ({ page }) => {
    await page.goto("/nonexistent");

    await expect(
      page.getByRole("heading", { name: "Page not found" }),
    ).toBeVisible();
  });
});
