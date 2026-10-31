import { readFile } from "node:fs/promises";
import { randomInt } from "node:crypto";
import { expect, type BrowserContext, type Page } from "@playwright/test";
import en from "../../messages/en.json";
import { MAIL_OUTBOX } from "./paths";

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

export interface Mail {
  to: string;
  subject: string;
  text: string;
}

export async function readMails(): Promise<Mail[]> {
  const raw = await readFile(MAIL_OUTBOX, "utf8").catch(() => "");
  const mails: Mail[] = [];
  for (const line of raw.split("\n")) {
    if (!line) continue;
    try {
      mails.push(JSON.parse(line) as Mail);
    } catch {
      // The server may still be writing the last line; the next poll sees it.
    }
  }
  return mails;
}

export const SUBJECT = {
  verify: en.emails.verify.subject,
  reset: en.emails.reset.subject,
  draw: en.emails.draw.subject,
  giftWaiting: en.emails.giftWaiting.subject,
  reassigned: en.emails.reassigned.subject,
};

/** Waits for a mail to `to` with this subject (matched by content, not order). */
export async function waitForMail(to: string, subject: string): Promise<Mail> {
  let found: Mail | undefined;
  await expect
    .poll(
      async () => {
        found = (await readMails()).find(
          (m) => m.to === to && m.subject === subject,
        );
        return found !== undefined;
      },
      { message: `mail "${subject}" to ${to}`, timeout: 20_000 },
    )
    .toBe(true);
  return found as Mail;
}

/** The app-relative path of the link in a mail that contains `part`. */
export function linkIn(mail: Mail, part: string): string {
  const match = mail.text.match(new RegExp(`https?://\\S*${part}\\S*`));
  if (!match) throw new Error(`no ${part} link in mail: ${mail.text}`);
  const url = new URL(match[0]);
  return url.pathname + url.search;
}

/** Registers in this browser, confirms the mail in it, signs in. */
export async function registerAndConfirm(
  page: Page,
  { email, password }: { email: string; password: string },
) {
  await page.goto("/register");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByLabel(/consent to the processing/i).check();
  await page.getByLabel(/at least 14/i).check();
  await page.getByRole("button", { name: "Sign up" }).click();
  await expect(page).toHaveURL(/\/check-email\?email=/);

  const mail = await waitForMail(email, SUBJECT.verify);
  await page.goto(linkIn(mail, "/verify-email"));
  await page.getByRole("button", { name: "Confirm email" }).click();
  await expect(
    page.getByRole("heading", { name: "Email confirmed" }),
  ).toBeVisible();
  await signIn(page, { email, password });
}

/**
 * Gives this browser its own client IP (the local server trusts `x-real-ip`).
 * Registration and "forgot password" are limited to 5 a minute per IP, and the
 * game plus the auth specs would otherwise share one address and trip it,
 * which real neighbours on different connections never do.
 */
export async function useOwnIp(context: BrowserContext) {
  const ip = `10.${randomInt(256)}.${randomInt(256)}.${randomInt(1, 255)}`;
  await context.setExtraHTTPHeaders({ "x-real-ip": ip });
}
