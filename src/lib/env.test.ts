import { describe, expect, it } from "vitest";
import { parseEnv } from "./env";

describe("parseEnv", () => {
  it("defaults to pglite mode", () => {
    const env = parseEnv({});
    expect(env.GRIDFIN_DB).toBe("pglite");
    expect(env.PGLITE_DATA_DIR).toBe(".pglite");
  });

  it("requires DATABASE_URL in remote mode", () => {
    expect(() => parseEnv({ GRIDFIN_DB: "remote" })).toThrow(/DATABASE_URL/);
  });

  it("accepts a valid remote config", () => {
    const env = parseEnv({
      GRIDFIN_DB: "remote",
      DATABASE_URL: "postgres://gridfin:gridfin@localhost:5432/gridfin",
    });
    expect(env.DATABASE_URL).toContain("5432");
  });

  it("boots with zero config and defaults LOG_LEVEL to info", () => {
    const env = parseEnv({});
    expect(env.LOG_LEVEL).toBe("info");
    expect(env.AUTH_SECRET).toBeUndefined();
    expect(env.AUTH_TRUST_HOST).toBeUndefined();
    expect(env.AUTH_GITHUB_ID).toBeUndefined();
    expect(env.AUTH_GITHUB_SECRET).toBeUndefined();
    expect(env.SENTRY_DSN).toBeUndefined();
    expect(env.NEXT_PUBLIC_SENTRY_DSN).toBeUndefined();
    expect(env.NEXT_PUBLIC_POSTHOG_KEY).toBeUndefined();
  });

  it("accepts all optional extended vars when provided", () => {
    const env = parseEnv({
      AUTH_SECRET: "s3cr3t",
      AUTH_TRUST_HOST: "true",
      AUTH_GITHUB_ID: "gh-id",
      AUTH_GITHUB_SECRET: "gh-secret",
      SENTRY_DSN: "https://example.ingest.sentry.io/123",
      NEXT_PUBLIC_SENTRY_DSN: "https://browser.ingest.sentry.io/456",
      NEXT_PUBLIC_POSTHOG_KEY: "phc_123",
      LOG_LEVEL: "debug",
    });
    expect(env.AUTH_SECRET).toBe("s3cr3t");
    expect(env.AUTH_TRUST_HOST).toBe("true");
    expect(env.AUTH_GITHUB_ID).toBe("gh-id");
    expect(env.AUTH_GITHUB_SECRET).toBe("gh-secret");
    expect(env.SENTRY_DSN).toBe("https://example.ingest.sentry.io/123");
    expect(env.NEXT_PUBLIC_SENTRY_DSN).toBe(
      "https://browser.ingest.sentry.io/456",
    );
    expect(env.NEXT_PUBLIC_POSTHOG_KEY).toBe("phc_123");
    expect(env.LOG_LEVEL).toBe("debug");
  });

  it("rejects an invalid LOG_LEVEL", () => {
    expect(() => parseEnv({ LOG_LEVEL: "verbose" })).toThrow(/LOG_LEVEL/);
  });

  it("defaults NEXT_PUBLIC_APP_URL to http://localhost:3210", () => {
    const env = parseEnv({});
    expect(env.NEXT_PUBLIC_APP_URL).toBe("http://localhost:3210");
  });

  it("accepts a custom NEXT_PUBLIC_APP_URL", () => {
    const env = parseEnv({ NEXT_PUBLIC_APP_URL: "https://example.com" });
    expect(env.NEXT_PUBLIC_APP_URL).toBe("https://example.com");
  });

  it("rejects an invalid NEXT_PUBLIC_APP_URL", () => {
    expect(() => parseEnv({ NEXT_PUBLIC_APP_URL: "not-a-url" })).toThrow(
      /NEXT_PUBLIC_APP_URL/,
    );
  });

  it("rejects an invalid SENTRY_DSN", () => {
    expect(() => parseEnv({ SENTRY_DSN: "not-a-url" })).toThrow(/SENTRY_DSN/);
  });

  it("defaults AUTH_DEV_BYPASS to false so a plain build never trips the guard", () => {
    const env = parseEnv({});
    expect(env.AUTH_DEV_BYPASS).toBe(false);
  });

  it("enables AUTH_DEV_BYPASS when .env.development sets it (dev server)", () => {
    const env = parseEnv({ AUTH_DEV_BYPASS: "true" });
    expect(env.AUTH_DEV_BYPASS).toBe(true);
  });

  it("throws when AUTH_DEV_BYPASS is on under NODE_ENV=production", () => {
    expect(() =>
      parseEnv({ NODE_ENV: "production", AUTH_DEV_BYPASS: "true" }),
    ).toThrow(/AUTH_DEV_BYPASS/);
  });

  it("allows production when AUTH_DEV_BYPASS is explicitly false", () => {
    const env = parseEnv({ NODE_ENV: "production", AUTH_DEV_BYPASS: "false" });
    expect(env.AUTH_DEV_BYPASS).toBe(false);
  });

  describe("E2E_MAIL_OUTBOX (test-only mail sink)", () => {
    const outbox = "/tmp/outbox.jsonl";

    it("is accepted for a local run", () => {
      expect(parseEnv({ E2E_MAIL_OUTBOX: outbox }).E2E_MAIL_OUTBOX).toBe(
        outbox,
      );
      expect(
        parseEnv({
          NODE_ENV: "production",
          E2E_MAIL_OUTBOX: outbox,
          NEXT_PUBLIC_APP_URL: "http://localhost:3210",
        }).E2E_MAIL_OUTBOX,
      ).toBe(outbox);
    });

    it("refuses to boot on Vercel", () => {
      expect(() => parseEnv({ E2E_MAIL_OUTBOX: outbox, VERCEL: "1" })).toThrow(
        /E2E_MAIL_OUTBOX/,
      );
    });

    it("refuses to boot with Gmail credentials", () => {
      expect(() =>
        parseEnv({ E2E_MAIL_OUTBOX: outbox, GMAIL_USER: "santa@gmail.com" }),
      ).toThrow(/E2E_MAIL_OUTBOX/);
      expect(() =>
        parseEnv({ E2E_MAIL_OUTBOX: outbox, GMAIL_APP_PASSWORD: "x" }),
      ).toThrow(/E2E_MAIL_OUTBOX/);
    });

    it("refuses to boot with a public app URL", () => {
      expect(() =>
        parseEnv({
          E2E_MAIL_OUTBOX: outbox,
          NEXT_PUBLIC_APP_URL: "https://santa.vercel.app",
        }),
      ).toThrow(/E2E_MAIL_OUTBOX/);
    });
  });

  it("provides dev defaults for the seed admin credentials", () => {
    const env = parseEnv({});
    expect(env.SEED_ADMIN_EMAIL).toBe("admin@example.local");
    expect(env.SEED_ADMIN_PASSWORD.length).toBeGreaterThanOrEqual(8);
  });

  it("keeps the Secret Santa vars optional and validates ADMIN_EMAIL", () => {
    const empty = parseEnv({});
    expect(empty.ADMIN_EMAIL).toBeUndefined();
    expect(empty.GMAIL_USER).toBeUndefined();
    expect(empty.GMAIL_APP_PASSWORD).toBeUndefined();
    expect(empty.CRON_SECRET).toBeUndefined();
    expect(empty.BLOB_READ_WRITE_TOKEN).toBeUndefined();

    expect(parseEnv({ ADMIN_EMAIL: "kate@example.com" }).ADMIN_EMAIL).toBe(
      "kate@example.com",
    );
    expect(() => parseEnv({ ADMIN_EMAIL: "not-an-email" })).toThrow(
      /ADMIN_EMAIL/,
    );
  });
});
