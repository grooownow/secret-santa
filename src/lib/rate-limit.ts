// In-memory fixed-window rate limiter, backed by a module-level Map.
//
// Fixed window (not sliding): a key's counter resets the moment `windowMs`
// elapses since its window started, rather than continuously decaying. This
// means a client can burst up to ~2x the limit by sending requests right
// before a window boundary and again right after it — acceptable for MVP,
// but worth knowing about before relying on this for strict rate control.
//
// This state is per-instance only: it resets on restart and is not shared
// across multiple server instances. For multi-instance production
// deployments, replace this with a store-backed limiter (e.g. Redis) — see
// the deploy playbook.

const DEFAULT_LIMIT = 10;
const DEFAULT_WINDOW_MS = 60_000;

// Once the store grows past this many keys, a rateLimit() call will sweep
// expired entries before proceeding, so keys that are never touched again
// don't accumulate forever.
const EVICTION_THRESHOLD = 10_000;

interface WindowEntry {
  count: number;
  windowStart: number;
  windowMs: number;
}

const store = new Map<string, WindowEntry>();

function sweepExpired(now: number): void {
  for (const [key, entry] of store) {
    if (now - entry.windowStart >= entry.windowMs) {
      store.delete(key);
    }
  }
}

export interface RateLimitOptions {
  limit?: number;
  windowMs?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

export function rateLimit(
  key: string,
  opts?: RateLimitOptions,
): RateLimitResult {
  const limit = opts?.limit ?? DEFAULT_LIMIT;
  const windowMs = opts?.windowMs ?? DEFAULT_WINDOW_MS;
  const now = Date.now();

  if (store.size > EVICTION_THRESHOLD) {
    sweepExpired(now);
  }

  const existing = store.get(key);

  if (!existing || now - existing.windowStart >= existing.windowMs) {
    store.set(key, { count: 1, windowStart: now, windowMs });
    return { allowed: true, remaining: Math.max(limit - 1, 0) };
  }

  if (existing.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  existing.count += 1;
  return { allowed: true, remaining: Math.max(limit - existing.count, 0) };
}

/** @internal test-only accessor for the module-level store size. */
export function getRateLimitStoreSizeForTests(): number {
  return store.size;
}

/** @internal test-only reset of the module-level store. */
export function resetRateLimitStoreForTests(): void {
  store.clear();
}
