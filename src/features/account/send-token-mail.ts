import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { renderEmail, sendMail } from "@/features/mail";
import { isLocale } from "@/i18n/locale";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { runAfterResponse } from "@/lib/run-after-response";
import {
  issueToken,
  latestPendingRegistration,
  type PendingRegistration,
} from "./tokens";

type Recipient = { id: string; email: string; locale: string };

function link(path: string, token: string): string {
  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  return `${base}${path}?token=${encodeURIComponent(token)}`;
}

async function issueAndSend(
  user: Recipient,
  type: "verify" | "reset",
  path: string,
  pending?: PendingRegistration,
): Promise<void> {
  const token = await issueToken(user.id, type, pending);
  const mail = renderEmail(type, isLocale(user.locale) ? user.locale : "en", {
    url: link(path, token),
  });
  await sendMail({ to: user.email, ...mail });
}

/**
 * Runs the token insert and the SMTP send after the response, so a request
 * takes the same time whether or not the address has an account. A failure is
 * logged, never shown: showing it would reveal the account.
 */
function queue(work: () => Promise<void>, type: string): void {
  runAfterResponse(async () => {
    try {
      await work();
    } catch (error) {
      logger.error({ err: error, type }, "could not send account email");
    }
  });
}

/** `"latest"` re-sends with the data of the newest unused verify token. */
export function queueVerifyEmail(
  user: Recipient,
  pending: PendingRegistration | "latest" | undefined,
): void {
  queue(async () => {
    const data =
      pending === "latest" ? await latestPendingRegistration(user.id) : pending;
    await issueAndSend(user, "verify", "/verify-email", data);
  }, "verify");
}

export function queueResetEmail(user: Recipient): void {
  queue(() => issueAndSend(user, "reset", "/reset-password"), "reset");
}

/**
 * Registration of an address: creates the account if it is new (without a
 * password: that arrives with the verify token) and mails the link. Runs
 * after the response, so new and existing addresses answer alike.
 */
export function queueRegistration(
  email: string,
  existingId: string | null,
  pending: PendingRegistration,
): void {
  queue(async () => {
    let id = existingId;
    if (!id) {
      const [created] = await getDb()
        .insert(users)
        .values({ email, locale: pending.locale })
        .onConflictDoNothing()
        .returning();
      id = created?.id ?? null;
      if (!id) {
        // Lost a race with a parallel registration: attach to that account.
        const [row] = await getDb()
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);
        if (!row || row.emailVerified) return;
        id = row.id;
      }
    }
    await issueAndSend(
      { id, email, locale: pending.locale },
      "verify",
      "/verify-email",
      pending,
    );
  }, "verify");
}
