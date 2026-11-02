import {
  devices,
  expect,
  test,
  type BrowserContext,
  type Page,
} from "@playwright/test";
import es from "../../messages/es.json";
import {
  type Mail,
  PHASES,
  readMails,
  registerAndConfirm as register,
  setDates,
  ORGANISER,
  SUBJECT,
  useOwnIp,
  waitForMail,
} from "./helpers";
import { ORGANISER_STATE } from "./paths";

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
// Registers like the others but leaves after the draw. The draw never puts
// two people of one flat next to each other, so with the child and this
// account gone first and second, every repaired pair is across flats.
const LEAVER: Neighbour = {
  name: "Dmitri Dorn",
  email: `dmitri-${RUN}@example.com`,
  building: "B",
  flat: "505",
};

async function fillOwnProfile(page: Page, who: Neighbour) {
  await page.getByRole("link", { name: "Fill in your profile" }).click();
  await page.getByLabel("Name", { exact: true }).fill(who.name);
  // The house picker is our own listbox, not a native select.
  await page.getByRole("combobox", { name: /Building/ }).click();
  await page.getByRole("option", { name: who.building, exact: true }).click();
  await page.getByLabel("Flat").fill(who.flat);
  await page.getByLabel("What would delight you").fill("Sweets and books");
  await page.getByLabel("What not to give").fill("Nothing with nuts");
  await page.getByRole("button", { name: "Save profile" }).click();
  // Saving lands on «Profile», the participant cards.
  await expect(page).toHaveURL(/\/home\/profile$/);
  await expect(
    page.getByRole("heading", { name: "You are in the game" }),
  ).toBeVisible();
  await expect(page.getByText(who.name)).toBeVisible();
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

/** Organiser withdraws a participant from the table (draw to 24 December). */
async function withdraw(organiser: Page, name: string) {
  await organiser.goto("/admin/participants");
  const row = organiser.getByRole("listitem").filter({ hasText: name });
  await row.getByRole("link", { name: "Withdraw" }).click();
  await organiser.getByRole("button", { name: "Confirm withdrawal" }).click();
  await expect(
    organiser.getByRole("heading", { name: "Our participants" }),
  ).toBeVisible();
  await expect(
    organiser.getByRole("listitem").filter({ hasText: name }),
  ).toHaveCount(0);
}

/**
 * Waits until exactly `count` "recipient changed" mails went to the accounts
 * of this game, and returns the browser of the latest addressee.
 */
async function expectReassignedMails(
  accounts: Browser[],
  count: number,
): Promise<Browser> {
  const sent = async () =>
    (await readMails()).filter(
      (m) =>
        m.subject === SUBJECT.reassigned &&
        accounts.some((a) => a.who.email === m.to),
    );
  await expect
    .poll(async () => (await sent()).length, {
      message: "recipient-changed mails",
    })
    .toBe(count);
  const latest = (await sent()).at(-1) as Mail;
  return accounts.find((a) => a.who.email === latest.to) as Browser;
}

test.describe("the whole game", () => {
  test.describe.configure({ mode: "serial", retries: 0 });
  test.setTimeout(4 * 60_000);

  test("sign-up, draw, gift, guess, reveal and Spanish", async ({
    browser,
    baseURL,
  }) => {
    const contexts: BrowserContext[] = [];
    const open = async (
      mobile: boolean,
      storageState?: string,
    ): Promise<Page> => {
      const context = await browser.newContext({
        ...(mobile
          ? devices["Pixel 7"]
          : { viewport: { width: 1280, height: 720 } }),
        baseURL,
        storageState,
      });
      contexts.push(context);
      await useOwnIp(context);
      return context.newPage();
    };

    try {
      // Signed in by the setup project (no extra admin sign-in here).
      const organiser = await open(false, ORGANISER_STATE);
      const neighbours: Browser[] = [];
      for (const who of NEIGHBOURS) {
        neighbours.push({ who, page: await open(true) });
      }
      const alice = neighbours[0] as Browser;
      const leaver: Browser = { who: LEAVER, page: await open(true) };
      const everyone = [...neighbours, leaver];

      await test.step("three neighbours and a leaver register and confirm their email", async () => {
        for (const { who, page } of everyone) {
          await register(page, { email: who.email, password: PASSWORD });
        }
      });

      await test.step("profiles: three adults, one with a child, and the leaver", async () => {
        for (const { who, page } of everyone) {
          await fillOwnProfile(page, who);
        }
        await addChild(alice.page, CHILD);
      });

      await test.step("organiser: the bottom menu carries «Admin» and fits 360px with six items", async () => {
        await organiser.setViewportSize({ width: 360, height: 740 });
        await organiser.goto("/admin");
        const menu = organiser.getByRole("navigation", {
          name: "Account menu",
        });
        await expect(menu.getByRole("link")).toHaveCount(6);
        await expect(menu.getByRole("link", { name: "Admin" })).toHaveAttribute(
          "aria-current",
          "page",
        );
        for (const locale of ["uk", "ru", "de", "en"] as const) {
          // oxlint-disable-next-line no-await-in-loop
          await organiser
            .context()
            .addCookies([
              { name: "locale", value: locale, url: organiser.url() },
            ]);
          // oxlint-disable-next-line no-await-in-loop
          await organiser.goto("/admin");
          // oxlint-disable-next-line no-await-in-loop
          const fits = await organiser.evaluate(
            () =>
              document.documentElement.scrollWidth <= window.innerWidth &&
              [...document.querySelectorAll("nav a")].every(
                (a) => a.getBoundingClientRect().right <= window.innerWidth,
              ),
          );
          expect(fits, `admin page fits 360px in ${locale}`).toBe(true);
        }
        await menu.getByRole("link", { name: "Home" }).click();
        await expect(organiser).toHaveURL(/\/home$/);
        await organiser.setViewportSize({ width: 1280, height: 800 });
      });

      await test.step("organiser runs the draw for five participants", async () => {
        await organiser.goto("/admin");
        await organiser.getByRole("button", { name: "Run the draw" }).click();
        await expect(
          organiser.getByText("Participants ready: 5"),
        ).toBeVisible();
        await organiser.getByRole("button", { name: "Yes, run it" }).click();
        await expect(organiser.getByText("The draw is done")).toBeVisible();
      });

      await test.step("everyone is emailed and sees the waiting cabinet", async () => {
        for (const { who } of everyone) {
          await waitForMail(who.email, SUBJECT.draw);
        }
        await alice.page.goto("/home");
        await expect(
          alice.page.getByRole("heading", {
            name: "Now you are someone's Santa",
          }),
        ).toBeVisible();
      });

      await test.step("withdrawing the child gives their Santa a new recipient", async () => {
        await withdraw(organiser, CHILD);
        const santa = await expectReassignedMails(everyone, 1);
        await santa.page.goto("/home");
        await expect(
          santa.page.getByText(
            "Your recipient changed after someone dropped out.",
          ),
        ).toBeVisible();
        await expect(
          santa.page.getByRole("heading", { name: /^Your recipient — / }),
        ).not.toContainText(CHILD);
      });

      await test.step("the leaver sends «I can’t take part»; the organiser is emailed and sees it", async () => {
        await leaver.page.goto("/home/settings");
        await leaver.page
          .getByRole("link", { name: "I can’t take part" })
          .click();
        await leaver.page
          .getByLabel(/Comment for the organiser/)
          .fill("Away for the holidays");
        await leaver.page
          .getByRole("button", { name: "I can’t take part" })
          .click();
        await expect(
          leaver.page.getByText(
            "Request sent. The organiser got an email and will confirm.",
          ),
        ).toBeVisible();
        await waitForMail(ORGANISER.email, "Secret Santa: a request to leave");

        await organiser.goto("/admin/participants");
        const row = organiser
          .getByRole("listitem")
          .filter({ hasText: LEAVER.name });
        await expect(
          row.getByText("Asks to leave («I can’t take part»)"),
        ).toBeVisible();
        await expect(row.getByText("Away for the holidays")).toBeVisible();
      });

      await test.step("a withdrawn adult loses their account and their Santa is moved", async () => {
        await withdraw(organiser, LEAVER.name);
        const santa = await expectReassignedMails(everyone, 2);
        await santa.page.goto("/home");
        await expect(
          santa.page.getByText(
            "Your recipient changed after someone dropped out.",
          ),
        ).toBeVisible();
        await expect(
          santa.page.getByRole("heading", { name: /^Your recipient — / }),
        ).not.toContainText(LEAVER.name);

        // The session outlived the account: the cabinet sends them to sign-in,
        // and the old password no longer works.
        await leaver.page.goto("/home");
        await expect(leaver.page).toHaveURL(/\/signin(\?|$)/);
        await leaver.page.getByLabel("Email").fill(LEAVER.email);
        await leaver.page.getByLabel("Password").fill(PASSWORD);
        await leaver.page.getByRole("button", { name: "Sign in" }).click();
        await expect(
          leaver.page.getByText(/invalid email or password/i),
        ).toBeVisible();
      });

      // The pairs are secret, so find a giver whose recipient is also one of
      // the three accounts we drive (a cycle of three, all of them).
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
        // Home links to the recipient's page («I give»), no big button.
        await giver.page
          .getByRole("link", { name: `Open the page: ${receiver.who.name}` })
          .click();
        await expect(
          // A repaired pair carries the "Recipient changed" chip instead.
          giver.page.getByText(/^(Your recipient|Recipient changed)$/),
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
        await from.page
          .getByRole("link", { name: `Open the page: ${to.who.name}` })
          .click();
        await from.page.getByRole("link", { name: "Leave the gift" }).click();
        await from.page
          .getByRole("combobox", { name: "Where was the gift left?" })
          .click();
        await from.page.getByRole("option", { name: "Locker" }).click();
        await expect(from.page.getByLabel("Number or code")).toHaveCount(0);
        await from.page.getByLabel(/Anonymous note/).fill("Happy holidays");
        await from.page.getByRole("button", { name: "Gift left" }).click();
        // Saving is final, so it asks first.
        const confirm = from.page.getByRole("dialog", {
          name: "Is everything right?",
        });
        await expect(confirm).toBeVisible();
        await confirm.getByRole("button", { name: "Yes, save" }).click();
        await expect(
          from.page.getByRole("heading", { name: "The surprise is in place!" }),
        ).toBeVisible();
        // Read-only from now on: no form fields to change.
        await expect(
          from.page.locator("form select, form textarea"),
        ).toHaveCount(0);
        await waitForMail(to.who.email, SUBJECT.giftWaiting);
      });

      await test.step("the receiver sees «My gift» with the place", async () => {
        // Home leads with «A gift for you»: the green box names the place.
        await to.page.goto("/home");
        await expect(
          to.page.getByText(`${to.who.name}, a gift is waiting for you!`),
        ).toBeVisible();
        await expect(to.page.getByText("It is in the locker.")).toBeVisible();
        await to.page.getByRole("link", { name: "Details" }).first().click();
        await expect(
          to.page.getByText("Your gift is waiting").first(),
        ).toBeVisible();
        await expect(to.page.getByText("Locker").first()).toBeVisible();
        await expect(to.page.getByText("Happy holidays")).toBeVisible();
      });

      await test.step("the receiver thanks on the wall and the Santa reads it", async () => {
        const thanks = `Thank you, the gift was perfect ${RUN}`;
        await to.page.goto("/home/wall");
        await to.page.getByRole("button", { name: "Add a post" }).click();
        await to.page.getByLabel("Your post").fill(thanks);
        await to.page
          .getByRole("button", { name: "Post", exact: true })
          .click();
        await expect(to.page.getByText(thanks)).toBeVisible();

        await from.page.goto("/home/wall");
        await expect(from.page.getByText(thanks)).toBeVisible();
        await expect(from.page.getByText(`${to.who.name} ·`)).toBeVisible();
      });

      await test.step("the receiver guesses their Santa (on «Profile»)", async () => {
        await to.page.goto("/home/profile");
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
