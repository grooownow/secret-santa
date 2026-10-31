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
vi.mock("./sign-in-form", () => ({
  SignInForm: () => <form data-testid="email-form" />,
}));

function order(markup: string) {
  return {
    google: markup.indexOf('data-testid="google-button"'),
    or: markup.indexOf("account.common.or"),
    form: markup.indexOf('data-testid="email-form"'),
  };
}

describe("sign-in page", () => {
  beforeEach(() => {
    providers.ids = ["google"];
  });

  it("sign-in page shows the Google button above the email form", async () => {
    const { SignInPage } = await import("./sign-in-page");

    for (const page of [await SignInPage({})]) {
      const o = order(await html(page));
      expect(o.google).toBeGreaterThan(-1);
      expect(o.google).toBeLessThan(o.or);
      expect(o.or).toBeLessThan(o.form);
    }
  });

  it("shows neither the Google button nor the divider when Google is not configured", async () => {
    providers.ids = [];
    const { SignInPage } = await import("./sign-in-page");

    for (const page of [await SignInPage({})]) {
      const o = order(await html(page));
      expect(o.google).toBe(-1);
      expect(o.or).toBe(-1);
      expect(o.form).toBeGreaterThan(-1);
    }
  });
});
