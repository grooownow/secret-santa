import { readFile } from "node:fs/promises";
import {
  devices,
  expect,
  test,
  type BrowserContext,
  type Page,
} from "@playwright/test";
import es from "../../messages/es.json";
import { MAIL_OUTBOX } from "../../playwright.config";

/**
 * The whole game on one server, end to end: three accounts (one with a child)
 * register and confirm their email, fill in profiles, the organiser runs the
 * draw, dates move forward through the admin "Dates" screen, a gift is left
 * and received, a guess is made, the Santa is revealed, and the language is
 * switched to Spanish.
 *
 * How the pieces work without back doors:
 * - Mail: the e2e server writes mail to a file (E2E_MAIL_OUTBOX, refused by
 *   src/lib/env.ts on any real deployment). Verification tokens are hashed in
 *   the database and bound to the registering browser by a cookie, so the
 *   test opens the link from the file in the SAME browser context that
 *   registered, exactly as a person would.
 * - Dates: changed only through the organiser's own settings screen, so
 *   nothing test-only exists in the app to move the clock.
 * - Viewports: the organiser uses a desktop context, the neighbours a
 *   Pixel 7 context. The project (`game-flow`) runs once, after the others,
 *   because the draw and the dates are global to the server.
 */

const ORGANISER = { email: "admin@example.local", password: "dev-admin-pw" };
const PASSWORD = "a-long-password";

const RUN = Date.now();
interface Neighbour {
  name: string;
  email: string;
  building: "K" | "B" | "D";
  flat: string;
}
const NEIGHBOURS: Neighbour[] = [
  {
    name: "Alice Anders",
    email: `alice-${RUN}@example.com`,
    building: "K",
    flat: "101",
  },
  {
    name: "Boris Brandt",
    email: `boris-${RUN}@example.com`,
    building: "B",
    flat: "202",
  },
  {
    name: "Carla Costa",
    email: `carla-${RUN}@example.com`,
    building: "D",
    flat: "303",
  },
];
const CHILD = "Kiddo Anders";

/** Today in Madrid, the clock the game itself uses, shifted by `days`. */
function madridDay(days = 0): string {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
  }).format(new Date());
  const [y, m, d] = today.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

const PHASES = {
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

interface Mail {
  to: string;
  subject: string;
  text: string;
}

async function readMails(): Promise<Mail[]> {
  const raw = await readFile(MAIL_OUTBOX, "utf8").catch(() => "");
  return raw
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Mail);
}

/** Waits for the nth (1-based) mail to `to` and returns it. */
async function waitForMail(to: string, nth = 1): Promise<Mail> {
  let found: Mail | undefined;
  await expect
    .poll(
      async () => {
        found = (await readMails()).filter((m) => m.to === to)[nth - 1];
        return found !== undefined;
      },
      { message: `mail #${nth} to ${to}`, timeout: 20_000 },
    )
    .toBe(true);
  return found as Mail;
}

/** The app-relative path of the link in a mail that contains `part`. */
function linkIn(mail: Mail, part: string): string {
  const match = mail.text.match(new RegExp(`https?://\\S*${part}\\S*`));
  if (!match) throw new Error(`no ${part} link in mail: ${mail.text}`);
  const url = new URL(match[0]);
  return url.pathname + url.search;
}

async function signIn(
  page: Page,
  { email, password }: { email: string; password: string },
) {
  await page.goto("/signin");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/home(\?|$)/);
}

async function setDates(page: Page, dates: Record<string, string>) {
  await page.goto("/admin/settings");
  for (const [label, value] of Object.entries(dates)) {
    await page.getByLabel(label, { exact: true }).fill(value);
  }
  await page.getByRole("button", { name: "Save dates" }).click();
  await expect(page.getByText("Dates saved.")).toBeVisible();
}

/** Registers in this browser, confirms the mail in it, signs in. */
async function registerAndConfirm(page: Page, who: Neighbour) {
  await page.goto("/register");
  await page.getByLabel("Email").fill(who.email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByLabel(/consent to the processing/i).check();
  await page.getByLabel(/at least 14/i).check();
  await page.getByRole("button", { name: "Sign up" }).click();
  await expect(page).toHaveURL(/\/check-email\?email=/);

  const mail = await waitForMail(who.email);
  await page.goto(linkIn(mail, "/verify-email"));
  await expect(
    page.getByRole("heading", { name: "Email confirmed" }),
  ).toBeVisible();
  await signIn(page, { email: who.email, password: PASSWORD });
}

async function fillOwnProfile(page: Page, who: Neighbour) {
  await page.getByRole("link", { name: "Fill in your profile" }).click();
  await page.getByLabel("Name", { exact: true }).fill(who.name);
  await page.getByLabel("Building").selectOption(who.building);
  await page.getByLabel("Flat").fill(who.flat);
  await page.getByLabel("What would delight you").fill("Sweets and books");
  await page.getByLabel("What not to give").fill("Nothing with nuts");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText(`You are in, ${who.name}!`)).toBeVisible();
}

async function addChild(page: Page, name: string) {
  await page.getByRole("link", { name: "Add a child" }).click();
  await page.getByLabel("Child name").fill(name);
  await page.getByLabel("Age", { exact: true }).fill("6");
  await page.getByLabel("What would delight").fill("Building sets");
  await page.getByLabel(/parent or guardian/i).check();
  await page.getByRole("button", { name: "Save child profile" }).click();
  await expect(page.getByText(name).first()).toBeVisible();
}

/** The recipient's name from the cabinet home ("Your recipient — Name"). */
async function recipientName(page: Page): Promise<string> {
  await page.goto("/home");
  const heading = page.getByRole("heading", { name: /^Your recipient — / });
  await expect(heading).toBeVisible();
  return ((await heading.textContent()) ?? "")
    .replace("Your recipient — ", "")
    .trim();
}

interface Browser {
  who: Neighbour;
  page: Page;
}

test.describe("the whole game", () => {
  test.describe.configure({ mode: "serial", retries: 0 });
  test.setTimeout(4 * 60_000);

  test("sign-up, draw, gift, guess, reveal and Spanish", async ({
    browser,
    baseURL,
  }) => {
    const contexts: BrowserContext[] = [];
    const open = async (mobile: boolean): Promise<Page> => {
      const context = await browser.newContext({
        ...(mobile
          ? devices["Pixel 7"]
          : { viewport: { width: 1280, height: 720 } }),
        baseURL,
      });
      contexts.push(context);
      return context.newPage();
    };

    try {
      const organiser = await open(false);
      const neighbours: Browser[] = [];
      for (const who of NEIGHBOURS) {
        neighbours.push({ who, page: await open(true) });
      }
      const alice = neighbours[0] as Browser;

      await test.step("organiser opens sign-ups with fresh dates", async () => {
        await signIn(organiser, ORGANISER);
        await setDates(organiser, PHASES.collect);
      });

      await test.step("three neighbours register and confirm their email", async () => {
        for (const { who, page } of neighbours) {
          await registerAndConfirm(page, who);
        }
      });

      await test.step("profiles: two adults and one adult with a child", async () => {
        for (const { who, page } of neighbours) {
          await fillOwnProfile(page, who);
        }
        await addChild(alice.page, CHILD);
      });

      await test.step("organiser runs the draw for four participants", async () => {
        await organiser.goto("/admin");
        await organiser.getByRole("button", { name: "Run the draw" }).click();
        await expect(
          organiser.getByText("Participants ready: 4"),
        ).toBeVisible();
        await organiser.getByRole("button", { name: "Yes, run it" }).click();
        await expect(organiser.getByText("The draw is done")).toBeVisible();
      });

      await test.step("everyone is emailed and sees the waiting cabinet", async () => {
        for (const { who } of neighbours) {
          // 1st mail: the confirmation link; 2nd: the draw email.
          await waitForMail(who.email, 2);
        }
        await alice.page.goto("/home");
        await expect(
          alice.page.getByRole("heading", {
            name: "Now you are someone's Santa",
          }),
        ).toBeVisible();
      });

      // The pairs are secret, so find a giver whose recipient is also one of
      // the three accounts we drive (a chain of four always has one).
      let giver: Browser | undefined;
      let receiver: Browser | undefined;

      await test.step("a giver sees the recipient card", async () => {
        for (const candidate of neighbours) {
          const name = await recipientName(candidate.page);
          const found = neighbours.find((n) => n.who.name === name);
          if (found) {
            giver = candidate;
            receiver = found;
            break;
          }
        }
        if (!giver || !receiver) throw new Error("no account-to-account pair");
        await giver.page
          .getByRole("link", { name: "View your recipient" })
          .click();
        await expect(
          giver.page.getByText("Your recipient", { exact: true }),
        ).toBeVisible();
        await expect(
          giver.page.getByText(receiver.who.name).first(),
        ).toBeVisible();
        await expect(
          giver.page.getByText(/Building [KBD] · flat /),
        ).toBeVisible();
        await expect(giver.page.getByText("Sweets and books")).toBeVisible();
      });
      if (!giver || !receiver) throw new Error("no account-to-account pair");
      const from = giver;
      const to = receiver;

      await test.step("gift time starts (dates moved in the admin)", async () => {
        await setDates(organiser, PHASES.gifts);
        await from.page.goto("/home");
        await expect(
          from.page.getByRole("heading", { name: "Time to make magic" }),
        ).toBeVisible();
      });

      await test.step("the giver marks the gift and the receiver is emailed", async () => {
        const mailsBefore = (await readMails()).filter(
          (m) => m.to === to.who.email,
        ).length;
        await from.page.getByRole("link", { name: "Gift left" }).click();
        await from.page
          .getByLabel("Where was the gift left?")
          .selectOption("locker");
        await from.page.getByLabel("Number or code").fill("L-42");
        await from.page.getByLabel(/Anonymous note/).fill("Happy holidays");
        await from.page.getByRole("button", { name: "Gift left" }).click();
        await expect(
          from.page.getByText("Saved, the email was sent to the recipient."),
        ).toBeVisible();
        await waitForMail(to.who.email, mailsBefore + 1);
      });

      await test.step("the receiver sees «My gift» with the place", async () => {
        await to.page.goto("/home");
        await to.page.getByRole("link", { name: "My gift" }).first().click();
        await expect(
          to.page.getByText("Your gift is waiting").first(),
        ).toBeVisible();
        await expect(to.page.getByText("L-42")).toBeVisible();
        await expect(to.page.getByText("Locker").first()).toBeVisible();
        await expect(to.page.getByText("Happy holidays")).toBeVisible();
      });

      await test.step("the receiver guesses their Santa", async () => {
        await to.page.goto("/home");
        await to.page
          .getByRole("link", { name: /Guess your Santa/ })
          .first()
          .click();
        await to.page.getByLabel(new RegExp(`^${from.who.name}`)).check();
        await to.page.getByRole("button", { name: "Save my guess" }).click();
        await expect(
          to.page.getByText(`Betting on ${from.who.name}`),
        ).toBeVisible();
      });

      await test.step("reveal day: the Santa is shown and the guess was right", async () => {
        await setDates(organiser, PHASES.reveal);
        await to.page.goto("/home");
        await to.page
          .getByRole("link", { name: "Find out who my Santa is" })
          .click();
        await expect(
          to.page.getByText(`Your Santa is ${from.who.name}`),
        ).toBeVisible();
        await expect(to.page.getByText("Spot on!")).toBeVisible();
      });

      await test.step("switching the language to Spanish translates the cabinet", async () => {
        await to.page.getByLabel("Choose a language").click();
        await to.page.getByRole("button", { name: /Español/ }).click();
        await expect(to.page.locator("html")).toHaveAttribute("lang", "es");
        await expect(
          to.page.getByText(
            es.reveal.card.title.replace("{name}", from.who.name),
          ),
        ).toBeVisible();
        await expect(to.page.getByText("Spot on!")).toHaveCount(0);
      });
    } finally {
      await Promise.all(contexts.map((context) => context.close()));
    }
  });
});
