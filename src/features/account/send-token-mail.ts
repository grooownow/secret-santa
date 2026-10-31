import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { isLocale } from "@/i18n/locale";
import { renderEmail, sendMail } from "@/features/mail";
import { issueToken } from "./tokens";

type Recipient = { id: string; email: string; locale: string };

function link(path: string, token: string): string {
  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  return `${base}${path}?token=${encodeURIComponent(token)}`;
}

async function send(
  user: Recipient,
  type: "verify" | "reset",
  path: string,
): Promise<void> {
  const token = await issueToken(user.id, type);
  const mail = renderEmail(type, isLocale(user.locale) ? user.locale : "en", {
    url: link(path, token),
  });
  try {
    await sendMail({ to: user.email, ...mail });
  } catch (error) {
    // The caller answers the same way whether or not this worked, so a
    // failure must not change the response (that would reveal the account).
    logger.error({ err: error, type }, "could not send account email");
  }
}

export function sendVerifyEmail(user: Recipient): Promise<void> {
  return send(user, "verify", "/verify-email");
}

export function sendResetEmail(user: Recipient): Promise<void> {
  return send(user, "reset", "/reset-password");
}
