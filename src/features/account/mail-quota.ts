import "server-only";
import { randomUUID } from "node:crypto";
import { count, like } from "drizzle-orm";
import { getDb } from "@/db/client";
import { sentEmails } from "@/db/schema";
import { todayInMadrid } from "@/lib/game-time";

/**
 * Account mails (verify and reset links) allowed per Madrid day, for the whole
 * site. Gmail allows about 500 recipients a day; the rest stays free for the
 * game mails (draw, gifts, reminder, reveal), which matter more.
 */
export const ACCOUNT_MAIL_DAILY_CAP = 200;

/**
 * Takes one account mail from today's quota. Returns false when the quota is
 * used up, so the caller skips the send. Each mail is a row in `sent_emails`
 * keyed `account-mail:<day>:<random>`; the daily purge removes them with the
 * rest. The count-then-insert is not atomic, so two parallel requests may go
 * one over the cap; that is fine for a safety cap.
 */
export async function takeAccountMailQuota(now = new Date()): Promise<boolean> {
  const prefix = `account-mail:${todayInMadrid(now)}:`;
  const db = getDb();
  const [row] = await db
    .select({ n: count() })
    .from(sentEmails)
    .where(like(sentEmails.key, `${prefix}%`));
  if ((row?.n ?? 0) >= ACCOUNT_MAIL_DAILY_CAP) return false;
  await db
    .insert(sentEmails)
    .values({ key: `${prefix}${randomUUID()}`, sentAt: now });
  return true;
}
