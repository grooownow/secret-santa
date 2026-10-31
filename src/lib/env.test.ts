import { describe, expect, it } from "vitest";
import { parseEnv } from "./env";

describe("parseEnv", () => {
  it("boots with zero config and defaults LOG_LEVEL to info", () => {
    const env = parseEnv({});
    expect(env.LOG_LEVEL).toBe("info");
    expect(env.SENTRY_DSN).toBeUndefined();
    expect(env.NEXT_PUBLIC_SENTRY_DSN).toBeUndefined();
    expect(env.NEXT_PUBLIC_POSTHOG_KEY).toBeUndefined();
  });

  it("accepts all optional extended vars when provided", () => {
    const env = parseEnv({
      SENTRY_DSN: "https://example.ingest.sentry.io/123",
      NEXT_PUBLIC_SENTRY_DSN: "https://browser.ingest.sentry.io/456",
      NEXT_PUBLIC_POSTHOG_KEY: "phc_123",
      LOG_LEVEL: "debug",
    });
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
});
