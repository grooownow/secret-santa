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

  test("link preview: English title and the Santa picture, in any language", async ({
    page,
    request,
  }) => {
    await page.goto("/");
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      "content",
      "Secret Santa",
    );
    const image = await page
      .locator('meta[property="og:image"]')
      .getAttribute("content");
    expect(image).toContain("opengraph-image");
    const response = await request.get(new URL(image as string).pathname);
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toContain("image/png");
  });

  test("desktop: the page column, the hero in two columns, a phone unchanged", async ({
    page,
  }) => {
    const left = async (name: string) =>
      (await page.getByRole("heading", { name, level: 1 }).boundingBox())?.x;
    const title = "Secret Santa for Bialto neighbours";
    const santa = page.locator("main img").first();

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    // The mockups' 1120px column: 160px margins on a 1440 screen.
    expect(await left(title)).toBe(160);
    const heading = await page
      .getByRole("heading", { name: title })
      .boundingBox();
    const picture = await santa.boundingBox();
    expect(picture!.x).toBeGreaterThanOrEqual(heading!.x + heading!.width);
    // Pages without a mockup keep the same left edge as the header.
    await page.goto("/rules");
    expect(await left("Rules and data")).toBe(160);

    await page.setViewportSize({ width: 375, height: 740 });
    await page.goto("/");
    expect(await left(title)).toBeLessThan(60);
    const phoneHeading = await page
      .getByRole("heading", { name: title })
      .boundingBox();
    const phonePicture = await santa.boundingBox();
    expect(phonePicture!.y).toBeGreaterThanOrEqual(
      phoneHeading!.y + phoneHeading!.height,
    );
  });

  test("favicon: a raster fallback next to the SVG, for browsers that skip SVG", async ({
    request,
  }) => {
    const ico = await request.get("/favicon.ico");
    expect(ico.status()).toBe(200);
    expect(ico.headers()["content-type"]).toContain("image/");
    const svg = await request.get("/icon.svg");
    expect(svg.status()).toBe(200);
  });

  test("unknown route renders the not-found page", async ({ page }) => {
    await page.goto("/nonexistent");

    await expect(
      page.getByRole("heading", { name: "Page not found" }),
    ).toBeVisible();
  });

  test("landing footer: only the author heading and its three links", async ({
    page,
  }) => {
    await page.goto("/");
    const footer = page.getByRole("contentinfo");

    await expect(
      footer.getByRole("heading", { name: "App author" }),
    ).toBeVisible();
    const links = footer.getByRole("link");
    await expect(links).toHaveCount(3);
    for (const [name, href] of [
      ["ludvik4.dev", "https://ludvik4.dev/"],
      ["Telegram", "https://t.me/ludvik4"],
      ["Threads", "https://www.threads.com/@ludvik.coffee"],
    ] as const) {
      const link = footer.getByRole("link", { name, exact: true });
      await expect(link).toHaveAttribute("href", href);
      await expect(link).toHaveAttribute("target", "_blank");
    }
    await expect(footer).not.toContainText("Game organizer");
    await expect(footer).not.toContainText("Rules and data");
  });

  test("other public pages have no footer", async ({ page }) => {
    for (const path of ["/rules", "/signin", "/register", "/nonexistent"]) {
      // oxlint-disable-next-line no-await-in-loop
      await page.goto(path);
      // oxlint-disable-next-line no-await-in-loop
      await expect(page.getByRole("contentinfo")).toHaveCount(0);
    }
  });
});
