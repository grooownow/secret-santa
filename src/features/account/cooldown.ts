import { headers } from "next/headers";
import { clientIp } from "@/lib/client-ip";
import { rateLimit } from "@/lib/rate-limit";

export const RESEND_SECONDS = 60;

/**
 * One verification email per address per 60 seconds, shared by registration
 * and the "send again" button. Returns the seconds left when it is too early.
 */
export function claimVerifySlot(email: string): number {
  const result = rateLimit(`verify-mail:${email}`, {
    limit: 1,
    windowMs: RESEND_SECONDS * 1000,
  });
  return result.allowed ? 0 : Math.ceil(result.retryAfterMs / 1000);
}

/** One reset email per address per 60 seconds. */
export function claimResetSlot(email: string): number {
  const result = rateLimit(`reset-mail:${email}`, {
    limit: 1,
    windowMs: RESEND_SECONDS * 1000,
  });
  return result.allowed ? 0 : Math.ceil(result.retryAfterMs / 1000);
}

/** 5 per minute per address, for registration and forgot password. */
export function underFormLimit(kind: "register" | "forgot", email: string) {
  return rateLimit(`${kind}:${email}`, { limit: 5, windowMs: 60_000 }).allowed;
}

export const IP_FORM_LIMIT = 5;

/**
 * 5 per minute per client IP and form, so one script cannot cycle through
 * many addresses. A request without an IP header is not limited here (the
 * per-address limit still applies), see `clientIp`.
 */
export async function underIpLimit(
  kind: "register" | "forgot" | "resend",
): Promise<boolean> {
  const ip = clientIp({ headers: await headers() });
  if (!ip) return true;
  return rateLimit(`${kind}:ip:${ip}`, {
    limit: IP_FORM_LIMIT,
    windowMs: 60_000,
  }).allowed;
}
