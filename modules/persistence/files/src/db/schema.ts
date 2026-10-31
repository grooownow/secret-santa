import type { AdapterAccountType } from "@auth/core/adapters";
import {
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
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
