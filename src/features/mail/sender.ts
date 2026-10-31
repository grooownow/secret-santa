import "server-only";
import { createTransport } from "nodemailer";
import { getDb } from "@/db/client";
import { sentEmails } from "@/db/schema";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { eq } from "drizzle-orm";

export type MailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

type Transport = (message: MailMessage) => Promise<void>;

let override: Transport | null = null;

/** Test hook: pass a transport to replace Gmail, or `null` to restore it. */
export function setMailTransportForTests(fn: Transport | null): void {
  override = fn;
}

// No `pool`: serverless functions do not keep connections between invocations.
function gmailTransport(user: string, pass: string): Transport {
  const transporter = createTransport({
    service: "gmail",
    auth: { user, pass },
  });
  return async (message) => {
    await transporter.sendMail({
      from: `Secret Santa <${user}>`,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
  };
}

export async function sendMail(message: MailMessage): Promise<void> {
  if (override) return override(message);

  const { GMAIL_USER, GMAIL_APP_PASSWORD, NODE_ENV } = env;
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    if (NODE_ENV === "production") {
      throw new Error("GMAIL_USER and GMAIL_APP_PASSWORD are not configured");
    }
    // Dev/test without credentials: show the mail in the log instead.
    logger.info(
      { to: message.to, subject: message.subject, text: message.text },
      "mail (not sent: no Gmail credentials)",
    );
    return;
  }
  await gmailTransport(GMAIL_USER, GMAIL_APP_PASSWORD)(message);
}

/**
 * Sends at most once per key. The key is recorded only after a successful
 * send, so a failed send can be retried. Returns false when already sent.
 */
export async function sendOnce(
  key: string,
  message: MailMessage,
): Promise<boolean> {
  const db = getDb();
  const [existing] = await db
    .select({ key: sentEmails.key })
    .from(sentEmails)
    .where(eq(sentEmails.key, key))
    .limit(1);
  if (existing) return false;

  await sendMail(message);
  await db.insert(sentEmails).values({ key }).onConflictDoNothing();
  return true;
}
