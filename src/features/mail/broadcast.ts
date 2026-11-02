import "server-only";
import { eq, isNotNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import { assignments, participants, sentEmails, users } from "@/db/schema";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/i18n/locale";
import { getSettings } from "@/lib/game-settings";
import { logger } from "@/lib/logger";
import { sendOnce, withMailSession } from "./sender";
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

/** The three tables every audience is computed from, read in parallel. */
async function loadAudienceData() {
  const db = getDb();
  const [rows, pairs] = await Promise.all([
    db
      .select({
        userId: users.id,
        email: users.email,
        locale: users.locale,
        participantId: participants.id,
        name: participants.name,
        createdAt: participants.createdAt,
      })
      .from(participants)
      .innerJoin(users, eq(users.id, participants.userId)),
    db
      .select({
        receiverId: assignments.receiverId,
        giverId: assignments.giverId,
        giftLeftAt: assignments.giftLeftAt,
      })
      .from(assignments),
  ]);
  return { rows, pairs };
}

type AudienceData = Awaited<ReturnType<typeof loadAudienceData>>;

/**
 * One recipient per account. draw / gifts-open / reveal: accounts with any
 * participant in the draw. reminder: accounts with a giver whose gift is not
 * marked as left yet.
 */
function buildAudience(
  event: BroadcastEvent,
  { rows, pairs }: AudienceData,
): Recipient[] {
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

async function audience(event: BroadcastEvent): Promise<Recipient[]> {
  return buildAudience(event, await loadAudienceData());
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
  const { giftsEndOn, revealOn } = await getSettings();
  let sent = 0;
  let failed = 0;
  // One Gmail connection for the whole run (see withMailSession).
  await withMailSession(async () => {
    // Sequential on purpose: Gmail is rate limited and one failure must not
    // stop the rest.
    for (const r of recipients) {
      try {
        const rendered = renderEmail(EMAIL_FOR_EVENT[event], r.locale, {
          names: r.names,
          dates: { giftsEndOn, revealOn },
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
  });
  return { total: recipients.length, sent, failed };
}

/**
 * Progress for the admin screen: how many of each event's audience already
 * got it. Reads the tables once for all events (the overview shows four).
 */
export async function broadcastStatuses<E extends BroadcastEvent>(
  events: readonly E[],
): Promise<Record<E, { total: number; sent: number }>> {
  const [data, sent] = await Promise.all([
    loadAudienceData(),
    getDb()
      .select({ key: sentEmails.key })
      .from(sentEmails)
      .where(isNotNull(sentEmails.sentAt)),
  ]);
  const keys = new Set(sent.map((row) => row.key));
  const result = {} as Record<E, { total: number; sent: number }>;
  for (const event of events) {
    const recipients = buildAudience(event, data);
    result[event] = {
      total: recipients.length,
      sent: recipients.filter((r) => keys.has(keyFor(event, r.userId))).length,
    };
  }
  return result;
}

/** One event's progress (see `broadcastStatuses`). */
export async function broadcastStatus(
  event: BroadcastEvent,
): Promise<{ total: number; sent: number }> {
  return (await broadcastStatuses([event]))[event];
}
