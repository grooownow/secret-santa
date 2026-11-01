import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderServerToHtml as html } from "../../../test/render-server";

const providers = vi.hoisted(() => ({ ids: ["google"] as string[] }));

vi.mock("next-intl/server", () => ({
  getTranslations: async (ns: string) => (key: string) => `${ns}.${key}`,
  getLocale: async () => "ru",
}));
vi.mock("@/lib/auth.config", () => ({
  get providerIds() {
    return providers.ids;
  },
}));
vi.mock("@/lib/auth", () => ({
  auth: async () => null,
  signIn: vi.fn(),
}));
vi.mock("@/db/client", () => ({ getDb: () => ({}) }));
vi.mock("@/features/game", () => ({
  SiteHeader: () => <header />,
  SiteFooter: () => <footer />,
}));
vi.mock("@/features/mail", () => ({
  renderEmail: vi.fn(),
  sendMail: vi.fn(),
}));
// The forms are client components with hooks; a marker stands in for them.
vi.mock("./register-form", () => ({
  RegisterForm: () => <form data-testid="email-form" />,
}));

function order(markup: string) {
  return {
    google: markup.indexOf('data-testid="google-button"'),
    or: markup.indexOf("account.common.or"),
    form: markup.indexOf('data-testid="email-form"'),
  };
}

describe("register page", () => {
  beforeEach(() => {
    providers.ids = ["google"];
  });

  it("register page shows the Google button above the email form", async () => {
    const { RegisterPage } = await import("./register-page");

    for (const page of [await RegisterPage()]) {
      const o = order(await html(page));
      expect(o.google).toBeGreaterThan(-1);
      expect(o.google).toBeLessThan(o.or);
      expect(o.or).toBeLessThan(o.form);
    }
  });

  it("the Google button carries the G logo left of its label", async () => {
    const { RegisterPage } = await import("./register-page");
    const markup = await html(await RegisterPage());
    const button = markup.slice(
      markup.indexOf('data-testid="google-button"'),
      markup.indexOf(
        "</button>",
        markup.indexOf('data-testid="google-button"'),
      ),
    );
    const logo = button.indexOf('data-testid="google-logo"');
    expect(logo).toBeGreaterThan(-1);
    expect(logo).toBeLessThan(button.indexOf("account.common.google"));
  });

  it("shows neither the Google button nor the divider when Google is not configured", async () => {
    providers.ids = [];
    const { RegisterPage } = await import("./register-page");

    for (const page of [await RegisterPage()]) {
      const o = order(await html(page));
      expect(o.google).toBe(-1);
      expect(o.or).toBe(-1);
      expect(o.form).toBeGreaterThan(-1);
    }
  });
});
