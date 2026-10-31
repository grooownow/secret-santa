import "server-only";
import { randomUUID } from "node:crypto";
import { count, like } from "drizzle-orm";
import { getDb } from "@/db/client";
import { sentEmails } from "@/db/schema";
import { todayInMadrid } from "@/lib/game-time";
import { logger } from "@/lib/logger";

/**
 * Account mails (verify and reset links) allowed per Madrid day, for the whole
 * site. Gmail allows about 500 recipients a day; the rest stays free for the
 * game mails (draw, gifts, reminder, reveal), which matter more.
 */
export const ACCOUNT_MAIL_DAILY_CAP = 200;
/**
 * The last part of the cap is kept for password resets of verified accounts,
 * so people already in the game can still get back in on a day when sign-ups
 * (or a script posting them) used up the rest.
 */
export const RESERVED_FOR_RESETS = 50;
const WARN_AT = Math.floor(ACCOUNT_MAIL_DAILY_CAP * 0.8);

/**
 * Takes one account mail from today's quota. Returns false when the quota is
 * used up, so the caller skips the send. `reserved` is true only for a reset
 * of a verified account, which may also use the reserved part. Callers check
 * the per-address and per-IP limits first, so a refused request spends
 * nothing. Each mail is a row in `sent_emails` keyed
 * `account-mail:<day>:<random>`; the purge removes them with the rest. The
 * count-then-insert is not atomic, so two parallel requests may go one over
 * the cap; that is fine for a safety cap.
 */
export async function takeAccountMailQuota(
  reserved: boolean,
  now = new Date(),
): Promise<boolean> {
  const prefix = `account-mail:${todayInMadrid(now)}:`;
  const db = getDb();
  const [row] = await db
    .select({ n: count() })
    .from(sentEmails)
    .where(like(sentEmails.key, `${prefix}%`));
  const used = row?.n ?? 0;
  const limit = reserved
    ? ACCOUNT_MAIL_DAILY_CAP
    : ACCOUNT_MAIL_DAILY_CAP - RESERVED_FOR_RESETS;
  if (used >= limit) return false;
  if (used + 1 === WARN_AT) {
    logger.warn(
      { used: used + 1, cap: ACCOUNT_MAIL_DAILY_CAP },
      "account mails reached 80% of the daily cap",
    );
  }
  await db
    .insert(sentEmails)
    .values({ key: `${prefix}${randomUUID()}`, sentAt: now });
  return true;
}
