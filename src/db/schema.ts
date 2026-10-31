import type { AdapterAccountType } from "@auth/core/adapters";
import { sql } from "drizzle-orm";
import {
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
    photoUrl: text("photo_url"),
    wishes: text("wishes").notNull().default(""),
    avoid: text("avoid").notNull().default(""),
    childConsentAt: timestamp("child_consent_at", { withTimezone: true }),
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
  giftLeftAt: timestamp("gift_left_at", { withTimezone: true }),
  notFoundAt: timestamp("not_found_at", { withTimezone: true }),
  backupOrganizedAt: timestamp("backup_organized_at", { withTimezone: true }),
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
});

// Idempotency ledger for mass mailings: a key is inserted before/after a send
// so a retry never mails the same person twice.
export const sentEmails = pgTable("sent_emails", {
  key: text("key").primaryKey(),
  sentAt: timestamp("sent_at", { withTimezone: true }).defaultNow().notNull(),
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
