import { createHash } from "node:crypto";
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  participants,
  translationAttempts,
  translations,
  users,
  wallPosts,
} from "@/db/schema";
import { LOCALES, isLocale, type Locale } from "@/i18n/locale";
import { logger } from "@/lib/logger";
import { runAfterResponse } from "@/lib/run-after-response";
import { getTranslator, translationEnabled } from "./translator";

/** At most this many sources are retried per daily run. */
export const RETRY_LIMIT = 40;
/** The daily job is shared: stop well before the function limit. */
export const RETRY_BUDGET_MS = 40_000;
const MAX_CONSECUTIVE_FAILURES = 3;

export type TextField = "wishes" | "avoid";

export const participantKey = (id: string, field: TextField) =>
  `participant:${id}:${field}`;
export const postKey = (id: string) => `post:${id}`;

/** Every translation key that belongs to a participant (not their posts). */
export const participantKeys = (id: string) => [
  participantKey(id, "wishes"),
  participantKey(id, "avoid"),
];

const hashOf = (text: string) =>
  createHash("sha256").update(text).digest("hex");

/**
 * Current original of a source, `null` if the source is gone, `undefined` if
 * the key is not one we know. Used to drop a translation of a text that was
 * edited while the translation was still running.
 */
async function currentText(
  sourceKey: string,
): Promise<string | null | undefined> {
  const db = getDb();
  const [kind, id, field] = sourceKey.split(":");
  if (!id) return undefined;
  if (kind === "participant" && (field === "wishes" || field === "avoid")) {
    const [row] = await db
      .select({ wishes: participants.wishes, avoid: participants.avoid })
      .from(participants)
      .where(eq(participants.id, id))
      .limit(1);
    return row ? row[field] : null;
  }
  if (kind === "post") {
    const [row] = await db
      .select({ text: wallPosts.text })
      .from(wallPosts)
      .where(eq(wallPosts.id, id))
      .limit(1);
    return row ? row.text : null;
  }
  return undefined;
}

/** Removes translations of a text that has since changed (or was cleared). */
export async function dropStaleTranslations(
  sourceKey: string,
  text: string,
): Promise<void> {
  const trimmed = text.trim();
  await getDb()
    .delete(translations)
    .where(
      trimmed
        ? and(
            eq(translations.sourceKey, sourceKey),
            ne(translations.sourceHash, hashOf(trimmed)),
          )
        : eq(translations.sourceKey, sourceKey),
    );
}

/**
 * Translates `text` into the other four locales and stores the result.
 * Idempotent: translations that already match the text are kept and only the
 * missing locales are requested. Stores whatever the translator returned and
 * then throws if some locales are still missing, so callers can count a
 * failure while a partial result is not lost.
 */
export async function translateAndStore(
  sourceKey: string,
  text: string,
  authorLocale: Locale,
): Promise<void> {
  const trimmed = text.trim();
  await dropStaleTranslations(sourceKey, trimmed);
  if (!trimmed) return;

  const db = getDb();
  const hash = hashOf(trimmed);
  // A translation into the author's own language is never shown.
  await db
    .delete(translations)
    .where(
      and(
        eq(translations.sourceKey, sourceKey),
        eq(translations.locale, authorLocale),
      ),
    );
  const have = await db
    .select({ locale: translations.locale })
    .from(translations)
    .where(eq(translations.sourceKey, sourceKey));
  const haveLocales = new Set(have.map((row) => row.locale));
  const targets = LOCALES.filter(
    (locale) => locale !== authorLocale && !haveLocales.has(locale),
  );
  if (targets.length === 0) return;

  const result = await getTranslator().translate(
    trimmed,
    authorLocale,
    targets,
  );

  const now = await currentText(sourceKey);
  // Edited or deleted while we were translating: the result is obsolete.
  if (now === null || (now !== undefined && hashOf(now.trim()) !== hash))
    return;

  const rows = targets.flatMap((locale) => {
    const value = result[locale]?.trim();
    return value ? [{ sourceKey, locale, text: value, sourceHash: hash }] : [];
  });
  if (rows.length > 0) {
    await db
      .insert(translations)
      .values(rows)
      .onConflictDoUpdate({
        target: [translations.sourceKey, translations.locale],
        set: {
          text: sql`excluded.text`,
          sourceHash: sql`excluded.source_hash`,
        },
      });
  }
  if (rows.length < targets.length) {
    throw new Error(`translation incomplete for ${sourceKey}`);
  }
}

/**
 * Called from the save paths: drops stale translations right away, then
 * translates after the response. Never throws and never delays the response.
 */
export async function scheduleTranslation(
  sourceKey: string,
  text: string,
  authorLocale: Locale,
): Promise<void> {
  await dropStaleTranslations(sourceKey, text).catch((error: unknown) =>
    logger.error(
      { err: error, sourceKey },
      "could not drop stale translations",
    ),
  );
  if (!text.trim() || !translationEnabled()) return;
  runAfterResponse(async () => {
    try {
      await translateAndStore(sourceKey, text, authorLocale);
    } catch (error) {
      logger.warn({ err: error, sourceKey }, "translation failed");
    }
  });
}

export interface LocalizedSource {
  key: string;
  /** The current original text; a translation of any other text is ignored. */
  original: string;
}

/**
 * Translations into `locale` for many sources in one query. A key maps to
 * `null` when there is no translation of the *current* original: a row whose
 * hash differs from the original's is stale and counts as missing.
 */
export async function getLocalized(
  sources: LocalizedSource[],
  locale: Locale,
): Promise<Map<string, string | null>> {
  const out = new Map<string, string | null>(sources.map((s) => [s.key, null]));
  if (sources.length === 0) return out;
  const hashes = new Map(
    sources.map((s) => [s.key, hashOf(s.original.trim())]),
  );
  const rows = await getDb()
    .select({
      sourceKey: translations.sourceKey,
      text: translations.text,
      sourceHash: translations.sourceHash,
    })
    .from(translations)
    .where(
      and(
        inArray(translations.sourceKey, [...hashes.keys()]),
        eq(translations.locale, locale),
      ),
    );
  for (const row of rows) {
    if (hashes.get(row.sourceKey) === row.sourceHash) {
      out.set(row.sourceKey, row.text);
    }
  }
  return out;
}

/** Deletes all translations of the given sources (participant or post removed). */
export async function deleteTranslations(sourceKeys: string[]): Promise<void> {
  if (sourceKeys.length === 0) return;
  const db = getDb();
  await db
    .delete(translations)
    .where(inArray(translations.sourceKey, sourceKeys));
  await db
    .delete(translationAttempts)
    .where(inArray(translationAttempts.sourceKey, sourceKeys));
}

interface Source {
  key: string;
  text: string;
  locale: Locale;
}

async function listSources(): Promise<Source[]> {
  const db = getDb();
  const people = await db
    .select({
      id: participants.id,
      wishes: participants.wishes,
      avoid: participants.avoid,
      locale: users.locale,
    })
    .from(participants)
    .innerJoin(users, eq(users.id, participants.userId));
  const posts = await db
    .select({ id: wallPosts.id, text: wallPosts.text, locale: users.locale })
    .from(wallPosts)
    .innerJoin(participants, eq(participants.id, wallPosts.participantId))
    .innerJoin(users, eq(users.id, participants.userId));

  const all: Source[] = [];
  for (const p of people) {
    const locale = isLocale(p.locale) ? p.locale : "en";
    all.push(
      { key: participantKey(p.id, "wishes"), text: p.wishes, locale },
      { key: participantKey(p.id, "avoid"), text: p.avoid, locale },
    );
  }
  for (const p of posts) {
    all.push({
      key: postKey(p.id),
      text: p.text,
      locale: isLocale(p.locale) ? p.locale : "en",
    });
  }
  return all.filter((s) => s.text.trim());
}

/**
 * Daily job: fills translations that failed or were never made. Bounded to
 * `limit` sources per run and idempotent (finished sources are skipped).
 */
export async function retryMissingTranslations(
  limit: number = RETRY_LIMIT,
  budgetMs: number = RETRY_BUDGET_MS,
): Promise<{ done: number; failed: number }> {
  if (!translationEnabled()) return { done: 0, failed: 0 };
  const db = getDb();
  const sources = await listSources();
  if (sources.length === 0) return { done: 0, failed: 0 };

  const existing = await db
    .select({
      sourceKey: translations.sourceKey,
      locale: translations.locale,
      sourceHash: translations.sourceHash,
    })
    .from(translations)
    .where(
      inArray(
        translations.sourceKey,
        sources.map((s) => s.key),
      ),
    );
  const valid = new Map<string, Set<string>>();
  for (const row of existing) {
    const set = valid.get(row.sourceKey) ?? new Set<string>();
    set.add(`${row.locale}:${row.sourceHash}`);
    valid.set(row.sourceKey, set);
  }

  const missing = sources.filter((s) => {
    const hash = hashOf(s.text.trim());
    const have = valid.get(s.key);
    return LOCALES.some((l) => l !== s.locale && !have?.has(`${l}:${hash}`));
  });
  if (missing.length === 0) return { done: 0, failed: 0 };

  // Never-tried sources first, then the least recently failed.
  const tried = new Map(
    (
      await db
        .select()
        .from(translationAttempts)
        .where(
          inArray(
            translationAttempts.sourceKey,
            missing.map((s) => s.key),
          ),
        )
    ).map((r) => [r.sourceKey, r.lastAttemptAt.getTime()]),
  );
  const pending = missing
    .toSorted((a, b) => (tried.get(a.key) ?? 0) - (tried.get(b.key) ?? 0))
    .slice(0, limit);

  const deadline = Date.now() + budgetMs;
  let done = 0;
  let failed = 0;
  let streak = 0;
  for (const source of pending) {
    if (Date.now() >= deadline || streak >= MAX_CONSECUTIVE_FAILURES) break;
    try {
      // oxlint-disable-next-line no-await-in-loop
      await translateAndStore(source.key, source.text, source.locale);
      done += 1;
      streak = 0;
      // oxlint-disable-next-line no-await-in-loop
      await db
        .delete(translationAttempts)
        .where(eq(translationAttempts.sourceKey, source.key));
    } catch (error) {
      failed += 1;
      streak += 1;
      logger.warn({ err: error, sourceKey: source.key }, "retry failed");
      try {
        // oxlint-disable-next-line no-await-in-loop
        await db
          .insert(translationAttempts)
          .values({ sourceKey: source.key })
          .onConflictDoUpdate({
            target: translationAttempts.sourceKey,
            set: {
              attempts: sql`${translationAttempts.attempts} + 1`,
              lastAttemptAt: new Date(),
            },
          });
      } catch (attemptError) {
        logger.warn({ err: attemptError }, "could not record the attempt");
      }
    }
  }
  return { done, failed };
}
