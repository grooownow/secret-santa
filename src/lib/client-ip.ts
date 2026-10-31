/** Anything with request headers: a `Request`, or `{ headers: await headers() }`. */
export type HasHeaders = { headers: Pick<Headers, "get"> };

/**
 * The caller's IP, or null when the request carries none. `x-real-ip` is set
 * by the platform (Vercel sets it and overwrites client values); the first
 * `x-forwarded-for` entry is the fallback. With no IP the per-IP bucket is
 * skipped rather than shared, so one anonymous request cannot lock out all
 * the others; the per-email limit still applies.
 */
export function clientIp(request: HasHeaders | undefined): string | null {
  const real = request?.headers.get("x-real-ip")?.trim();
  if (real) return real;
  const forwarded = request?.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || null;
}
