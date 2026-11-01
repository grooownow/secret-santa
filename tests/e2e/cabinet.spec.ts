import { expect, test } from "@playwright/test";
import { registerAndConfirm, useOwnIp } from "./helpers";

// A 1×1 PNG: enough for the browser to decode and compress.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

/**
 * The cabinet after the owner's UI wave: five-item menu that fits 360px, the
 * house listbox (keyboard and mouse), the whole photo block opening the file
 * chooser, «Profile» showing the saved card with its photo, the real label of
 * the settings link and the «share the game» popover. Runs in both auth
 * projects (desktop and Pixel 7) while sign-ups are open.
 */
test("cabinet: menu, house listbox, photo, profile cards, settings, share", async ({
  page,
  context,
  baseURL,
}, testInfo) => {
  test.setTimeout(90_000);
  await useOwnIp(context);
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const email = `cabinet-${testInfo.project.name}-${Date.now()}@example.com`;
  const name = `Cabi ${testInfo.project.name}`;
  await registerAndConfirm(page, { email, password: "a-long-password" });

  await test.step("the menu has five items and fits a 360px screen", async () => {
    await page.setViewportSize({ width: 360, height: 740 });
    const menu = page.getByRole("navigation", { name: "Account menu" });
    await expect(menu.getByRole("link")).toHaveText([
      "Home",
      "Profile",
      "Gift",
      "Wall",
      "Settings",
    ]);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflow).toBe(false);
  });

  await test.step("house listbox: keyboard, then mouse", async () => {
    await page.getByRole("link", { name: "Fill in your profile" }).click();
    await page.getByLabel("Name", { exact: true }).fill(name);
    await page.getByLabel("Flat").fill("42");
    const house = page.getByRole("combobox", { name: "Building" });

    // No house yet: the browser-side check stops the save at the field.
    await page.getByRole("button", { name: "Save profile" }).click();
    await expect(house).toHaveAttribute("aria-invalid", "true");
    await expect(house).toHaveAccessibleDescription("Choose your building.");
    await expect(page).toHaveURL(/\/home\/participants\/new$/);

    await house.focus();
    await page.keyboard.press("ArrowDown");
    await expect(page.getByRole("listbox")).toBeVisible();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("listbox")).toHaveCount(0);
    await expect(house).toHaveText("B");

    await house.click();
    await page.getByRole("option", { name: "D", exact: true }).click();
    await expect(house).toHaveText("D");
    await expect(house).toHaveAttribute("aria-expanded", "false");
    await expect(house).not.toHaveAttribute("aria-invalid", "true");
  });

  await test.step("the whole photo block opens the file chooser", async () => {
    const chooser = page.waitForEvent("filechooser");
    // The block's title, not the small action text.
    await page.getByText("Photo, if you like").click();
    await (
      await chooser
    ).setFiles({ name: "me.png", mimeType: "image/png", buffer: PNG });
    await expect(page.getByText("Replace the photo")).toBeVisible();
    await page.getByRole("button", { name: "Save profile" }).click();
  });

  await test.step("«Profile» shows the saved card with the photo", async () => {
    await expect(page).toHaveURL(/\/home\/profile$/);
    await expect(
      page.getByRole("heading", { name: "You are in the game" }),
    ).toBeVisible();
    const card = page.getByRole("listitem").filter({ hasText: name });
    await expect(
      card.getByRole("img", { name: `Photo: ${name}` }),
    ).toBeVisible();
    await expect(card).toContainText("Building D · flat 42");
    await expect(
      card.getByRole("link", { name: "Edit profile" }),
    ).toBeVisible();
  });

  await test.step("settings: the leave link has a real label", async () => {
    await page
      .getByRole("navigation", { name: "Account menu" })
      .getByRole("link", { name: "Settings" })
      .click();
    await expect(
      page.getByRole("link", { name: "Leave the game" }),
    ).toBeVisible();
    await expect(page.getByText("settings.delete")).toHaveCount(0);
  });

  await test.step("share: QR, copy to clipboard, closes on outside click", async () => {
    await page.getByRole("button", { name: "Share the game" }).click();
    const dialog = page.getByRole("dialog", { name: "Invite your neighbours" });
    await expect(
      dialog.getByRole("img", { name: "QR code with the link to the game" }),
    ).toBeVisible();
    const box = await dialog.boundingBox();
    expect(box && box.x >= 0 && box.x + box.width <= 360).toBe(true);

    await dialog.getByRole("button", { name: "Copy" }).click();
    await expect(dialog.getByText("Copied")).toBeVisible();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(new URL(copied).origin).toBe(new URL(baseURL as string).origin);

    // A click on the page gutter next to the popover, away from any control.
    if (!box) throw new Error("no popover box");
    await page.mouse.click(4, box.y + box.height / 2);
    await expect(dialog).toHaveCount(0);
  });

  // The game flow later draws exactly its own participants, so this account
  // leaves again — through the settings link checked above.
  await test.step("the leave link deletes the account", async () => {
    await page.getByRole("link", { name: "Leave the game" }).click();
    await page.getByRole("button", { name: "Yes, delete the account" }).click();
    await expect(page).toHaveURL(/\/$/);
  });
});
