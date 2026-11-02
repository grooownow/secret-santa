import type { AdapterAccountType } from "@auth/core/adapters";
import { sql } from "drizzle-orm";
import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  // Auth.js (@auth/drizzle-adapter) columns — populated by OAuth providers.
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  // Local (credentials) login. Nullable: OAuth-only users have no password.
  passwordHash: text("password_hash"),
  // Game profile (Secret Santa). All nullable/defaulted so Google sign-in
  // users can be created before they fill anything in.
  locale: text("locale").notNull().default("en"),
  building: text("building"),
  apartment: text("apartment"),
  consentVersion: text("consent_version"),
  consentAt: timestamp("consent_at", { withTimezone: true }),
  // Bumped when an account is verified, reset or taken over by Google, so
  // sessions issued before that moment stop working (see requireAccount).
  sessionVersion: integer("session_version").notNull().default(0),
  // «Готов(а) быть запасным Сантой»: the organizer may ask this account to
  // prepare a gift for someone left without a Santa.
  backupVolunteer: boolean("backup_volunteer").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// Auth.js OAuth account links (@auth/drizzle-adapter's documented Drizzle
// schema: https://authjs.dev/reference/adapter/drizzle). Column/field names
// mirror `AdapterAccount` exactly since the adapter inserts that object
// as-is — do not rename them.
//
// We deliberately do NOT define a `sessions` table or `verificationTokens`
// table: sessions use the JWT strategy (see src/lib/auth.config.ts), so
// there is no server-side session lookup, and magic-link email sign-in is
// out of scope for this app. Both are optional on the adapter's
// `DefaultPostgresSchema` type, so omitting them is supported.
export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  ],
);

export const participantKind = pgEnum("participant_kind", ["adult", "child"]);

// Optional for children (owner, 2 Nov): helps the Santa pick a gift. Not
// asked for adults; null means "not said".
export const childGender = pgEnum("child_gender", ["boy", "girl"]);
export const giftPlace = pgEnum("gift_place", ["locker", "mailbox"]);
export const tokenPurpose = pgEnum("token_purpose", ["verify", "reset"]);

// One account can hold several participants: the adult themself plus any
// children added to the account.
export const participants = pgTable(
  "participants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: participantKind("kind").notNull(),
    name: text("name").notNull(),
    age: integer("age"),
    gender: childGender("gender"),
    photoUrl: text("photo_url"),
    wishes: text("wishes").notNull().default(""),
    avoid: text("avoid").notNull().default(""),
    childConsentAt: timestamp("child_consent_at", { withTimezone: true }),
    // «Не могу участвовать»: asked by the account after the draw; the
    // organizer confirms with «Выбытие» (which removes the row).
    exitRequestedAt: timestamp("exit_requested_at", { withTimezone: true }),
    exitComment: text("exit_comment"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (participant) => [
    // At most one adult per account (children are unlimited).
    uniqueIndex("participants_one_adult_per_user")
      .on(participant.userId)
      .where(sql`${participant.kind} = 'adult'`),
  ],
);

// Draw result: each receiver has exactly one row; each giver gives at most
// one gift (unique). giverId becomes null when the giver drops out.
export const assignments = pgTable("assignments", {
  receiverId: uuid("receiver_id")
    .primaryKey()
    .references(() => participants.id, { onDelete: "cascade" }),
  giverId: uuid("giver_id")
    .unique()
    .references(() => participants.id, { onDelete: "set null" }),
  giftPlace: giftPlace("gift_place"),
  giftCode: text("gift_code"),
  giftNote: text("gift_note"),
  // Grows on every mark or edit; part of the email key, so each edit mails
  // the receiver again (`gift:<receiverId>:<version>`).
  giftVersion: integer("gift_version").notNull().default(0),
  giftLeftAt: timestamp("gift_left_at", { withTimezone: true }),
  notFoundAt: timestamp("not_found_at", { withTimezone: true }),
  backupOrganizedAt: timestamp("backup_organized_at", { withTimezone: true }),
  // The organizer put this receiver on «Помощь» by hand.
  backupRequestedAt: timestamp("backup_requested_at", { withTimezone: true }),
  // A volunteer the organizer asked to prepare this receiver's gift.
  backupVolunteerId: uuid("backup_volunteer_id").references(() => users.id, {
    onDelete: "set null",
  }),
  reassignedAt: timestamp("reassigned_at", { withTimezone: true }),
});

export const guesses = pgTable("guesses", {
  participantId: uuid("participant_id")
    .primaryKey()
    .references(() => participants.id, { onDelete: "cascade" }),
  guessedId: uuid("guessed_id")
    .notNull()
    .references(() => participants.id, { onDelete: "cascade" }),
});

export const wallPosts = pgTable("wall_posts", {
  id: uuid("id").defaultRandom().primaryKey(),
  participantId: uuid("participant_id")
    .notNull()
    .references(() => participants.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  photoUrl: text("photo_url"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// Email verification / password reset tokens. Only the hash is stored.
export const authTokens = pgTable("auth_tokens", {
  tokenHash: text("token_hash").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  purpose: tokenPurpose("purpose").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  // Registration data bound to a verify token: it is applied to the user only
  // when this very token is consumed, so whoever owns the mailbox decides the
  // password. Null on reset tokens and on plain verify tokens.
  pendingPasswordHash: text("pending_password_hash"),
  pendingLocale: text("pending_locale"),
  pendingConsentVersion: text("pending_consent_version"),
  pendingConsentAt: timestamp("pending_consent_at", { withTimezone: true }),
  // SHA-256 of the nonce cookie set in the registrant's browser. The pending
  // data above is applied only when the browser that opens the link presents
  // the same nonce (see src/features/account/verify-email-action.ts).
  pendingNonceHash: text("pending_nonce_hash"),
});

// Idempotency ledger for mass mailings. A row is a claim made before sending
// (only the inserter sends); sentAt is set once the send succeeds, and a failed
// send deletes the claim. A claim with sentAt null older than 10 minutes may be
// reclaimed (crash recovery). See src/features/mail/sender.ts.
export const sentEmails = pgTable("sent_emails", {
  key: text("key").primaryKey(),
  claimedAt: timestamp("claimed_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
});

// Single-row table (id is always 1). Dates are `YYYY-MM-DD` strings in the
// Madrid time zone; see src/features/game/phase.ts.
export const settings = pgTable("settings", {
  id: integer("id").primaryKey().default(1),
  applicationsCloseOn: text("applications_close_on").notNull(),
  drawOn: text("draw_on").notNull(),
  giftsStartOn: text("gifts_start_on").notNull(),
  giftsEndOn: text("gifts_end_on").notNull(),
  revealOn: text("reveal_on").notNull(),
  closeOn: text("close_on").notNull(),
  drawnAt: timestamp("drawn_at", { withTimezone: true }),
  purgedAt: timestamp("purged_at", { withTimezone: true }),
});

// Auto-translations of user texts. `sourceKey` is `participant:<id>:wishes`,
// `participant:<id>:avoid` or `post:<id>`; there is no foreign key, so rows are
// removed together with their source by the translation feature. `sourceHash`
// (SHA-256 of the original) marks a translation of an older text as stale.
export const translations = pgTable(
  "translations",
  {
    sourceKey: text("source_key").notNull(),
    locale: text("locale").notNull(),
    text: text("text").notNull(),
    sourceHash: text("source_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (translation) => [
    primaryKey({ columns: [translation.sourceKey, translation.locale] }),
  ],
);

// Failed translation attempts, so the daily retry puts recently failed
// sources last and one poisonous text cannot starve the others.
export const translationAttempts = pgTable("translation_attempts", {
  sourceKey: text("source_key").primaryKey(),
  attempts: integer("attempts").notNull().default(1),
  lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
