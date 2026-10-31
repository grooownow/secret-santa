import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { createTranslator } from "next-intl";
import { renderServerToHtml as html } from "../../../test/render-server";
import ruMessages from "../../../messages/ru.json";
import { defaultSettings, registrationOpen } from "@/lib/game-phase";
import { LandingPage } from "./landing-page";
import { RulesContent } from "./rules-content";

// Real Russian texts, so the spec wording and the dates are what is tested.
vi.mock("next-intl/server", () => ({
  getTranslations: async (namespace?: string) =>
    createTranslator({
      locale: "ru",
      messages: ruMessages,
      namespace: namespace as never,
    }),
}));

// The game index pulls in the database; the header and footer are not under test.
vi.mock("@/features/game", () => ({
  registrationOpen,
  SiteHeader: ({ action }: { action?: React.ReactNode }) => (
    <header>{action}</header>
  ),
  SiteFooter: ({ organizer }: { organizer?: React.ReactNode }) => (
    <footer>{organizer}</footer>
  ),
}));

const open = new Date("2026-11-20T10:00:00Z");
const closed = new Date("2026-12-08T10:00:00Z");

const render = (over: Partial<Parameters<typeof LandingPage>[0]> = {}) =>
  html(
    <LandingPage
      settings={defaultSettings()}
      now={open}
      locale="ru"
      signedIn={false}
      {...over}
    />,
  );

describe("LandingPage", () => {
  it("hero names Secret Santa and Bialto", async () => {
    const out = await render();
    expect(out).toContain("<h1");
    expect(out).toMatch(/<h1[^>]*>Тайный Санта для соседей Bialto<\/h1>/);
    expect(out).toContain("Игра держится на нас");
    expect(out).toContain("Заявки принимаем до 6 декабря.");
  });

  it("copy has no invite code and no 10–20 €", async () => {
    const out = await render();
    expect(out).not.toMatch(/10[–-]20/);
    expect(out).not.toMatch(/инвайт|код приглашения|invite/i);
    expect(out).toContain("10–15 €");
  });

  it("while registration is open the CTA leads to register", async () => {
    const out = await render();
    expect(out).toContain('href="/register"');
    expect(out).not.toContain("alreadyIn");
  });

  it("after the deadline the CTA leads to sign-in", async () => {
    const out = await render({ now: closed });
    expect(out).not.toContain('href="/register"');
    expect(out).toMatch(/<a [^>]*href="\/signin"[^>]*><span>Стать Сантой/);
    expect(out).toContain("Приём заявок закончился.");
  });

  it("dates come from settings", async () => {
    const out = await render({
      settings: defaultSettings({
        applicationsCloseOn: "2026-12-09",
        drawOn: "2026-12-10",
        giftsStartOn: "2026-12-26",
        giftsEndOn: "2026-12-30",
      }),
    });
    expect(out).toContain("Заявки принимаем до 9 декабря.");
    expect(out).toContain("Зарегистрируйся до 9 декабря.");
    expect(out).toContain("Оставь подарок с 26 по 30 декабря.");
    expect(out).toContain("25 декабря");
    expect(out).not.toContain("6 декабря");
    expect(out).not.toContain("с 25 по 31");
  });

  it("the organizer line sits inside the footer block", async () => {
    const out = await render();
    const footer = out.slice(out.indexOf("<footer>"));
    expect(footer).toContain("Kate");
    expect(footer).toContain("https://t.me/ludvik4");
  });

  it("FAQ names the real button label", async () => {
    const out = await render();
    expect(out).toContain("«Подарка нет на месте»");
  });

  it("a signed-in visitor gets the cabinet instead of the Santa CTAs", async () => {
    const out = await render({ signedIn: true });
    expect(out).toContain('href="/home"');
    expect(out).toContain("В кабинет");
    expect(out).not.toContain("Стать Сантой");
    expect(out).not.toContain('href="/register"');
  });

  it("after the deadline the final block no longer invites to join", async () => {
    const out = await render({ now: closed });
    expect(out).not.toContain("Осталось только присоединиться");
    expect(out).not.toContain("Кто-то из соседей уже готов");
    expect(out).toContain("Заявки закрыты");
    expect(out).toMatch(/<a [^>]*href="\/signin"[^>]*><span>Войти/);
    expect(out).not.toContain("Заявки принимаем до");
    const whileOpen = await render();
    expect(whileOpen).toContain(
      "Осталось только присоединиться. Заявки принимаем до 6 декабря.",
    );
  });
});

describe("translations of the landing", () => {
  const load = (l: string) =>
    JSON.parse(
      readFileSync(
        path.resolve(__dirname, "../../../messages", `${l}.json`),
        "utf8",
      ),
    );

  it("step 4 names the real «gift left» button in every locale", () => {
    for (const l of ["ru", "uk", "en", "es", "de"]) {
      const m = load(l);
      expect(m.landing.how.steps["4"].text).toContain(m.gift.form.submit);
    }
  });

  it("es and en step 4 titles use the from/to dates", () => {
    expect(load("es").landing.how.steps["4"].title).toContain("{from} al {to}");
    expect(load("en").landing.how.steps["4"].title).toContain(
      "{startFull} to {endShort}",
    );
  });
});

describe("RulesContent", () => {
  it("names the responsible person, processors and retention from settings", async () => {
    const out = await html(
      <RulesContent
        settings={defaultSettings({ closeOn: "2027-01-12" })}
        locale="ru"
        version="2026-10-31"
      />,
    );
    for (const word of [
      "Kate",
      "Vercel",
      "Neon",
      "Gmail",
      "Groq",
      "Google Переводчик",
      "здоровье",
      "14",
    ]) {
      expect(out).toContain(word);
    }
    expect(out).toContain("12 января 2027");
    expect(out).toContain("https://t.me/ludvik4");
    expect(out).toContain("2026-10-31");
  });
});
