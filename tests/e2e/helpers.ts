import { expect, type Page } from "@playwright/test";

export const ORGANISER = {
  email: "admin@example.local",
  password: "dev-admin-pw",
};

/** Today in Madrid, the clock the game itself uses, shifted by `days`. */
export function madridDay(days = 0): string {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
  }).format(new Date());
  const [y, m, d] = today.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export const PHASES = {
  // Sign-ups open (the server starts with the real defaults; a test run long
  // after them would otherwise find sign-ups already closed).
  collect: {
    "Last day for entries": madridDay(5),
    "Draw date": madridDay(6),
    "Gifts start": madridDay(7),
    "Gifts end": madridDay(8),
    "Santas revealed": madridDay(9),
    "Game closes": madridDay(20),
  },
  gifts: {
    "Last day for entries": madridDay(-2),
    "Draw date": madridDay(-1),
    "Gifts start": madridDay(0),
    "Gifts end": madridDay(1),
    "Santas revealed": madridDay(2),
    "Game closes": madridDay(20),
  },
  reveal: {
    "Last day for entries": madridDay(-4),
    "Draw date": madridDay(-3),
    "Gifts start": madridDay(-2),
    "Gifts end": madridDay(-1),
    "Santas revealed": madridDay(0),
    "Game closes": madridDay(20),
  },
} as const;

export async function signIn(
  page: Page,
  { email, password }: { email: string; password: string },
) {
  await page.goto("/signin");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/home(\?|$)/);
}

export async function setDates(page: Page, dates: Record<string, string>) {
  await page.goto("/admin/settings");
  for (const [label, value] of Object.entries(dates)) {
    await page.getByLabel(label, { exact: true }).fill(value);
  }
  await page.getByRole("button", { name: "Save dates" }).click();
  await expect(page.getByText("Dates saved.")).toBeVisible();
}
