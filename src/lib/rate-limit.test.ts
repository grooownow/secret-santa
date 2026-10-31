import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getRateLimitStoreSizeForTests,
  resetRateLimitStoreForTests,
  rateLimit,
} from "./rate-limit";

describe("rateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetRateLimitStoreForTests();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests under the limit", () => {
    const key = "under-limit";
    const result = rateLimit(key, { limit: 3, windowMs: 1000 });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it("blocks requests over the limit", () => {
    const key = "over-limit";
    rateLimit(key, { limit: 2, windowMs: 1000 });
    rateLimit(key, { limit: 2, windowMs: 1000 });
    const result = rateLimit(key, { limit: 2, windowMs: 1000 });
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("restores allowance after the window expires", () => {
    const key = "window-expiry";
    rateLimit(key, { limit: 1, windowMs: 1000 });
    const blocked = rateLimit(key, { limit: 1, windowMs: 1000 });
    expect(blocked.allowed).toBe(false);

    vi.advanceTimersByTime(1001);

    const afterExpiry = rateLimit(key, { limit: 1, windowMs: 1000 });
    expect(afterExpiry.allowed).toBe(true);
    expect(afterExpiry.remaining).toBe(0);
  });

  it("tracks independent keys without interference", () => {
    const a = rateLimit("key-a", { limit: 1, windowMs: 1000 });
    const b = rateLimit("key-b", { limit: 1, windowMs: 1000 });
    expect(a.allowed).toBe(true);
    expect(b.allowed).toBe(true);

    const aAgain = rateLimit("key-a", { limit: 1, windowMs: 1000 });
    expect(aAgain.allowed).toBe(false);
  });

  it("applies default limit and windowMs when opts are omitted", () => {
    const result = rateLimit("defaults-key");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(9);
  });

  it("sweeps expired entries once the store grows past the eviction threshold", () => {
    const windowMs = 1000;

    // Push the store past the eviction threshold (10_000 entries).
    for (let i = 0; i <= 10_000; i++) {
      rateLimit(`key-${i}`, { limit: 1, windowMs });
    }
    expect(getRateLimitStoreSizeForTests()).toBe(10_001);

    // Expire every one of those entries.
    vi.advanceTimersByTime(windowMs + 1);

    // The next call should trigger a sweep pass before inserting itself,
    // dropping all expired entries and keeping the store bounded.
    rateLimit("trigger-sweep", { limit: 1, windowMs });

    expect(getRateLimitStoreSizeForTests()).toBeLessThanOrEqual(1);
  });
});
