import "server-only";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { z } from "zod";
import { env } from "@/lib/env";
import type { Unnotified } from "./withdraw";

/** How long "send again" works after a withdrawal. */
const RETRY_TTL_MS = 24 * 60 * 60 * 1000;

// Without AUTH_SECRET (local dev only; Auth.js needs it in production) a
// per-process key still keeps the token opaque, it just dies on restart.
const fallbackSecret = randomBytes(32).toString("hex");

function key(): Buffer {
  return createHash("sha256")
    .update(`withdraw-retry:${env.AUTH_SECRET ?? fallbackSecret}`)
    .digest();
}

const payloadSchema = z.object({
  exp: z.number(),
  items: z
    .array(
      z.object({
        userId: z.uuid(),
        giverIds: z.array(z.uuid()).min(1).max(100),
        at: z.number().int().positive(),
      }),
    )
    .min(1)
    .max(100),
});

/**
 * Packs the unsent "recipient changed" mails into an encrypted token
 * (AES-256-GCM). The organizer's browser only holds this opaque value and a
 * count: the ids inside would tell her who was the withdrawn person's Santa.
 */
export function sealRetry(items: Unnotified[], now = Date.now()): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([
    cipher.update(JSON.stringify({ exp: now + RETRY_TTL_MS, items })),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64url");
}

/** The items inside a token, or null when it is forged, broken or expired. */
export function openRetry(
  token: string,
  now = Date.now(),
): Unnotified[] | null {
  try {
    const raw = Buffer.from(token, "base64url");
    const decipher = createDecipheriv(
      "aes-256-gcm",
      key(),
      raw.subarray(0, 12),
    );
    decipher.setAuthTag(raw.subarray(12, 28));
    const json = Buffer.concat([
      decipher.update(raw.subarray(28)),
      decipher.final(),
    ]).toString("utf8");
    const parsed = payloadSchema.safeParse(JSON.parse(json));
    if (!parsed.success || parsed.data.exp < now) return null;
    return parsed.data.items;
  } catch {
    return null;
  }
}
