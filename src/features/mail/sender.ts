import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import { appendFile } from "node:fs/promises";
import { createTransport, type Transporter } from "nodemailer";
import { getDb } from "@/db/client";
import { sentEmails } from "@/db/schema";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { and, eq, isNull, lt } from "drizzle-orm";

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

/**
 * Without these a hung Gmail connection waits for nodemailer's defaults
 * (socket: 10 minutes) and eats the whole function budget (300 s).
 */
export const SMTP_TIMEOUTS = {
  connectionTimeout: 15_000,
  greetingTimeout: 15_000,
  socketTimeout: 30_000,
} as const;

function gmailTransporter(user: string, pass: string, pool: boolean) {
  return createTransport({
    service: "gmail",
    auth: { user, pass },
    ...SMTP_TIMEOUTS,
    // A pool only inside one mail session (one invocation); never kept
    // between serverless invocations.
    ...(pool ? { pool: true, maxConnections: 1 } : {}),
  });
}

/** The pooled transporter of the running mail session, if any. */
const session = new AsyncLocalStorage<{ transporter?: Transporter }>();

/**
 * Runs `work` with one Gmail connection reused for every mail it sends
 * (one TLS + login instead of one per mail), and closes it at the end. Used
 * by broadcasts, so 70 mails stay well inside the function's time limit.
 */
export async function withMailSession<T>(work: () => Promise<T>): Promise<T> {
  const state: { transporter?: Transporter } = {};
  try {
    return await session.run(state, work);
  } finally {
    state.transporter?.close();
  }
}

function gmailTransport(user: string, pass: string): Transport {
  const state = session.getStore();
  let transporter: Transporter;
  if (state) {
    state.transporter ??= gmailTransporter(user, pass, true);
    transporter = state.transporter;
  } else {
    transporter = gmailTransporter(user, pass, false);
  }
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

  // E2E only (env.ts refuses this variable on any real deployment): write the
  // mail to a file the test reads, instead of sending it.
  if (env.E2E_MAIL_OUTBOX) {
    await appendFile(
      /*turbopackIgnore: true*/ env.E2E_MAIL_OUTBOX,
      `${JSON.stringify(message)}\n`,
    );
    return;
  }

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

const STALE_CLAIM_MS = 10 * 60 * 1000;

/** True when this caller now owns the key and must send. */
async function claim(key: string): Promise<boolean> {
  const db = getDb();
  const inserted = await db
    .insert(sentEmails)
    .values({ key })
    .onConflictDoNothing()
    .returning();
  if (inserted.length > 0) return true;

  // Crash recovery: take over an unfinished claim. The conditional update
  // lets exactly one reclaimer win.
  const reclaimed = await db
    .update(sentEmails)
    .set({ claimedAt: new Date() })
    .where(
      and(
        eq(sentEmails.key, key),
        isNull(sentEmails.sentAt),
        lt(sentEmails.claimedAt, new Date(Date.now() - STALE_CLAIM_MS)),
      ),
    )
    .returning();
  return reclaimed.length > 0;
}

/**
 * Sends at most once per key: claim first, then send, then mark sent. A failed
 * send releases the claim so a rerun retries; a failure to mark leaves the
 * claim in place so nobody is mailed twice. Returns false when the key is
 * already sent or being sent by someone else.
 */
export async function sendOnce(
  key: string,
  message: MailMessage,
): Promise<boolean> {
  if (!(await claim(key))) return false;
  const db = getDb();

  try {
    await sendMail(message);
  } catch (error) {
    await db
      .delete(sentEmails)
      .where(and(eq(sentEmails.key, key), isNull(sentEmails.sentAt)));
    throw error;
  }
  await db
    .update(sentEmails)
    .set({ sentAt: new Date() })
    .where(eq(sentEmails.key, key));
  return true;
}
