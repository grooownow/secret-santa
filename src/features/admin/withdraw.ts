import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  assignments,
  participants,
  settings,
  users,
  wallPosts,
} from "@/db/schema";
import { canExit, getPhase } from "@/features/game";
import { renderEmail, sendOnce } from "@/features/mail";
import { flatKey } from "@/features/profile";
import {
  deleteTranslations,
  participantKeys,
  postKey,
} from "@/features/translation";
import { DEFAULT_LOCALE, isLocale } from "@/i18n/locale";
import { DEFAULT_DATES } from "@/lib/game-phase";
import { isAdminEmail } from "@/lib/admin-email";
import { logger } from "@/lib/logger";
import { deletePhotos } from "@/lib/photo-storage";

/** Givers of one account whose "recipient changed" mail did not go out. */
export interface Unnotified {
  userId: string;
  giverIds: string[];
  /** Withdrawal time in ms; part of the mail key, so a retry is idempotent. */
  at: number;
}

export type WithdrawResult =
  | { ok: true; removed: number; unnotified: Unnotified[] }
  | { ok: false; reason: "notFound" | "closed" };

type Db = ReturnType<typeof getDb>;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

type Affected = { giverId: string; receiverId: string | null };

/** Flat of a participant: an account without an address is its own flat. */
async function flatKeyOf(tx: Tx, participantId: string): Promise<string> {
  const [row] = await tx
    .select({
      userId: participants.userId,
      building: users.building,
      apartment: users.apartment,
    })
    .from(participants)
    .innerJoin(users, eq(users.id, participants.userId))
    .where(eq(participants.id, participantId))
    .limit(1);
  if (!row) return `gone:${participantId}`;
  return row.building && row.apartment
    ? flatKey(row.building, row.apartment)
    : `none:${row.userId}`;
}

/**
 * Removes one participant from the chain and closes the gap (spec, "Выбытие").
 * Giver A of D now gives to D's receiver R, unless A is missing or shares a
 * flat with R: then R is left without a Santa (backup list). Returns the
 * givers whose situation changed, for the email.
 */
async function removeFromChain(
  tx: Tx,
  id: string,
  now: Date,
): Promise<Affected | null> {
  const [incoming] = await tx
    .select()
    .from(assignments)
    .where(eq(assignments.receiverId, id))
    .limit(1);
  const [outgoing] = await tx
    .select()
    .from(assignments)
    .where(eq(assignments.giverId, id))
    .limit(1);
  const giverId = incoming?.giverId ?? null;
  const receiverId = outgoing?.receiverId ?? null;

  // Frees A's slot (giver_id is unique) and D's own slot as a giver.
  if (incoming) {
    await tx.delete(assignments).where(eq(assignments.receiverId, id));
  }
  if (outgoing) {
    await tx
      .update(assignments)
      .set({ giverId: null })
      .where(eq(assignments.receiverId, outgoing.receiverId));
  }

  if (!giverId) return null;
  if (!receiverId || receiverId === giverId) {
    return { giverId, receiverId: null };
  }
  const [giverFlat, receiverFlat] = await Promise.all([
    flatKeyOf(tx, giverId),
    flatKeyOf(tx, receiverId),
  ]);
  if (giverFlat === receiverFlat) return { giverId, receiverId: null };

  await tx
    .update(assignments)
    .set({ giverId, reassignedAt: now })
    .where(eq(assignments.receiverId, receiverId));
  return { giverId, receiverId };
}

/**
 * One mail per account and variant, listing the account's affected givers.
 * The key holds the account and the withdrawal time, never a pair. Givers who
 * have left since are skipped. Throws when the send fails.
 */
export async function notifyAccount(
  userId: string,
  giverIds: string[],
  at: number,
): Promise<void> {
  const db = getDb();
  const people = await db
    .select({
      id: participants.id,
      name: participants.name,
      email: users.email,
      locale: users.locale,
    })
    .from(participants)
    .innerJoin(users, eq(users.id, participants.userId))
    .where(
      and(eq(participants.userId, userId), inArray(participants.id, giverIds)),
    )
    .orderBy(participants.createdAt);
  const first = people[0];
  if (!first) return;
  const withReceiver = new Set(
    (
      await db
        .select({ giverId: assignments.giverId })
        .from(assignments)
        .where(inArray(assignments.giverId, giverIds))
    ).map((row) => row.giverId),
  );
  const locale = isLocale(first.locale) ? first.locale : DEFAULT_LOCALE;
  for (const noReceiver of [false, true]) {
    const names = people
      .filter((p) => withReceiver.has(p.id) !== noReceiver)
      .map((p) => p.name);
    if (names.length === 0) continue;
    const rendered = renderEmail("reassigned", locale, { names, noReceiver });
    // oxlint-disable-next-line no-await-in-loop
    await sendOnce(`reassigned:${userId}:${at}:${noReceiver ? "n" : "r"}`, {
      to: first.email,
      ...rendered,
    });
  }
}

/**
 * Removes a participant and, when it is the account's adult, every
 * participant of that account. In the collect phase this is plain deletion of
 * the application; from the draw to 24 December it repairs the chain; later
 * it is refused. The check runs inside the transaction under a lock on the
 * settings row, so it serialises with the draw, profile writes and other
 * withdrawals. Photos, translations and wall posts go with the participant.
 * The old giver of the leaving participant gets no access to their card
 * because the row is gone (the card answers 404).
 */
export async function withdrawParticipant(
  id: string,
  now: Date = new Date(),
): Promise<WithdrawResult> {
  const db = getDb();
  const outcome = await db.transaction(async (tx) => {
    await tx
      .insert(settings)
      .values({ id: 1, ...DEFAULT_DATES })
      .onConflictDoNothing();
    const [row] = await tx
      .select()
      .from(settings)
      .where(eq(settings.id, 1))
      .for("update");
    if (!row) throw new Error("settings row missing");
    const phase = getPhase(now, row);
    if (phase !== "collect" && !canExit(now, row)) {
      return { ok: false, reason: "closed" } as const;
    }

    const [target] = await tx
      .select()
      .from(participants)
      .where(eq(participants.id, id))
      .limit(1);
    if (!target) return { ok: false, reason: "notFound" } as const;

    const doomed =
      target.kind === "adult"
        ? await tx
            .select()
            .from(participants)
            .where(eq(participants.userId, target.userId))
        : [target];
    const doomedIds = doomed.map((p) => p.id);
    const posts = await tx
      .select({ id: wallPosts.id, photoUrl: wallPosts.photoUrl })
      .from(wallPosts)
      .where(inArray(wallPosts.participantId, doomedIds));

    const affected: Affected[] = [];
    for (const p of doomed) {
      // Sequential on purpose: each removal sees the chain the last one left.
      // oxlint-disable-next-line no-await-in-loop
      const change = await removeFromChain(tx, p.id, now);
      if (change) affected.push(change);
    }
    // An adult leaves with the whole account (spec, "Данные"); a child alone.
    // The organizer's account stays (only her participants go), or she would
    // lose the admin area for the rest of the game.
    const [owner] = await tx
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, target.userId))
      .limit(1);
    if (target.kind === "adult" && !isAdminEmail(owner?.email)) {
      await tx.delete(users).where(eq(users.id, target.userId));
    } else if (target.kind === "adult") {
      await tx.delete(participants).where(inArray(participants.id, doomedIds));
    } else {
      await tx.delete(participants).where(eq(participants.id, target.id));
    }
    return {
      ok: true,
      doomedIds,
      affected,
      photos: [
        ...doomed.flatMap((p) => (p.photoUrl ? [p.photoUrl] : [])),
        ...posts.flatMap((p) => (p.photoUrl ? [p.photoUrl] : [])),
      ],
      keys: [
        ...doomedIds.flatMap(participantKeys),
        ...posts.map((p) => postKey(p.id)),
      ],
    } as const;
  });

  if (!outcome.ok) return outcome;

  await deleteTranslations([...outcome.keys]).catch((error: unknown) =>
    logger.error({ err: error }, "could not delete translations"),
  );
  await deletePhotos([...outcome.photos]).catch((error: unknown) =>
    logger.error({ err: error }, "could not delete photos"),
  );

  // Final state per giver: a giver changed twice gets one mail about where
  // they ended up, and an account with several givers gets one mail.
  const gone = new Set(outcome.doomedIds);
  const givers = [...new Set(outcome.affected.map((a) => a.giverId))].filter(
    (g) => !gone.has(g),
  );
  const owners = givers.length
    ? await getDb()
        .select({ id: participants.id, userId: participants.userId })
        .from(participants)
        .where(inArray(participants.id, givers))
    : [];
  const byAccount = new Map<string, string[]>();
  for (const o of owners) {
    byAccount.set(o.userId, [...(byAccount.get(o.userId) ?? []), o.id]);
  }
  const at = now.getTime();
  const unnotified: Unnotified[] = [];
  for (const [userId, giverIds] of byAccount) {
    try {
      // oxlint-disable-next-line no-await-in-loop
      await notifyAccount(userId, giverIds, at);
    } catch (error) {
      logger.error({ err: error }, "could not send the reassigned mail");
      unnotified.push({ userId, giverIds, at });
    }
  }
  logger.info(
    { removed: outcome.doomedIds.length, unnotified: unnotified.length },
    "participant withdrawn",
  );
  return { ok: true, removed: outcome.doomedIds.length, unnotified };
}
