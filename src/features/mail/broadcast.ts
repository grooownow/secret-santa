import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { assignments, participants, sentEmails, users } from "@/db/schema";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/i18n/locale";
import { logger } from "@/lib/logger";
import { sendOnce } from "./sender";
import { renderEmail, type EmailType } from "./templates";

export type BroadcastEvent = "draw" | "gifts-open" | "reminder" | "reveal";

const EMAIL_FOR_EVENT: Record<BroadcastEvent, EmailType> = {
  draw: "draw",
  "gifts-open": "giftsOpen",
  reminder: "reminder",
  reveal: "reveal",
};

type Recipient = {
  userId: string;
  email: string;
  locale: Locale;
  names: string[];
};

const keyFor = (event: BroadcastEvent, userId: string) => `${event}:${userId}`;

/**
 * One recipient per account. draw / gifts-open / reveal: accounts with any
 * participant in the draw. reminder: accounts with a giver whose gift is not
 * marked as left yet.
 */
async function audience(event: BroadcastEvent): Promise<Recipient[]> {
  const db = getDb();
  const rows = await db
    .select({
      userId: users.id,
      email: users.email,
      locale: users.locale,
      participantId: participants.id,
      name: participants.name,
      createdAt: participants.createdAt,
    })
    .from(participants)
    .innerJoin(users, eq(users.id, participants.userId));

  const pairs = await db
    .select({
      receiverId: assignments.receiverId,
      giverId: assignments.giverId,
      giftLeftAt: assignments.giftLeftAt,
    })
    .from(assignments);

  const included = new Set<string>();
  if (event === "reminder") {
    for (const a of pairs) {
      if (a.giverId && a.giftLeftAt === null) included.add(a.giverId);
    }
  } else {
    for (const a of pairs) {
      included.add(a.receiverId);
      if (a.giverId) included.add(a.giverId);
    }
  }

  const byUser = new Map<string, Recipient>();
  for (const r of rows
    .filter((row) => included.has(row.participantId))
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())) {
    const existing = byUser.get(r.userId);
    if (existing) {
      existing.names.push(r.name);
    } else {
      byUser.set(r.userId, {
        userId: r.userId,
        email: r.email,
        locale: isLocale(r.locale) ? r.locale : DEFAULT_LOCALE,
        names: [r.name],
      });
    }
  }
  return [...byUser.values()].sort((a, b) => a.email.localeCompare(b.email));
}

/**
 * Sends the event's email to everyone who has not got it yet, one by one.
 * A failed send is counted and skipped; rerunning sends only the unsent.
 * `sent` counts emails sent by this run.
 */
export async function runBroadcast(
  event: BroadcastEvent,
): Promise<{ total: number; sent: number; failed: number }> {
  const recipients = await audience(event);
  let sent = 0;
  let failed = 0;
  // Sequential on purpose: Gmail is rate limited and one failure must not
  // stop the rest.
  for (const r of recipients) {
    try {
      const rendered = renderEmail(EMAIL_FOR_EVENT[event], r.locale, {
        names: r.names,
      });
      if (
        await sendOnce(keyFor(event, r.userId), { to: r.email, ...rendered })
      ) {
        sent += 1;
      }
    } catch (error) {
      failed += 1;
      // Never log the address or the pairing, only the account id.
      logger.error(
        { err: error, event, userId: r.userId },
        "broadcast send failed",
      );
    }
  }
  return { total: recipients.length, sent, failed };
}

/** Progress for the admin screen: how many of the audience already got it. */
export async function broadcastStatus(
  event: BroadcastEvent,
): Promise<{ total: number; sent: number }> {
  const recipients = await audience(event);
  const keys = new Set(
    (await getDb().select({ key: sentEmails.key }).from(sentEmails)).map(
      (row) => row.key,
    ),
  );
  return {
    total: recipients.length,
    sent: recipients.filter((r) => keys.has(keyFor(event, r.userId))).length,
  };
}
