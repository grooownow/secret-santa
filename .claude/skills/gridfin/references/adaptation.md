# Gridfin Step 4 — Adaptation reference

Recipes for the brand pass, domain schema, factories, and seed. The rules
files remain the source of truth — `docs/rules/architecture.md` for
migrations/data access, `docs/rules/testing.md` for factories,
`docs/rules/frontend.md` for tokens. This file only adds the concrete
patterns those rules assume.

## Brand token recipe (sub-step 4b)

`src/app/globals.css` defines every color as an oklch token, in two blocks:
`:root` (light) and `.dark`. The neutral template ships chroma 0 (gray).
The minimal brand pass changes only the primary family, in **both** blocks:

- Convert the user's preference to an oklch hue angle (examples: red ≈ 25,
  orange ≈ 60, yellow ≈ 95, green ≈ 150, teal ≈ 185, blue ≈ 245,
  violet ≈ 290, pink ≈ 350). From a hex value, compute or estimate the
  nearest oklch equivalent.
- Light block (`:root`): `--primary: oklch(0.55 0.18 <hue>)`,
  `--primary-foreground: oklch(0.985 0 0)` (near-white),
  `--ring: oklch(0.55 0.14 <hue>)`.
- Dark block (`.dark`): `--primary: oklch(0.75 0.15 <hue>)`,
  `--primary-foreground: oklch(0.205 0 0)` (near-black),
  `--ring: oklch(0.65 0.12 <hue>)`.
- Tune lightness ±0.05 if the user asked for "dark/deep" or "bright/light"
  shades, keeping the pairing rule: light theme = dark primary + light
  foreground, dark theme = light primary + dark foreground. That pairing is
  what keeps contrast safe (see frontend.md's token-pair rule).
- Touch nothing else — secondary/muted/accent stay neutral in v1; a fuller
  brand system is a later `/feature`, not onboarding.

## Domain schema recipe (sub-step 4c)

Derive tables from the specs' Data model sections — the core nouns of the
PRD (3-6 tables is the v1 norm). Append to `src/db/schema.ts`; never touch
the existing `users`/`accounts` tables.

Per-table pattern (mirrors the existing `users` table style):

```ts
export const trips = pgTable("trips", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  status: text("status").notNull().default("draft"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
```

Rules of thumb:

- **Ownership:** every user-owned table carries `userId` → `users.id` with
  `onDelete: "cascade"` (this is also the data-deletion path compliance
  relies on). Child tables cascade from their parent instead.
- **Keys:** `uuid` primary keys via `defaultRandom()`; `snake_case` column
  names, `camelCase` TS fields — exactly like `users`.
- **Types:** stick to `text`, `integer`, `boolean`, `timestamp`, `uuid`,
  `jsonb` for v1. Enum-like fields are `text` with a `.default()`; reach for
  `pgEnum` only when a spec demands db-level enforcement.
- **Timestamps:** every table gets `createdAt` with
  `{ withTimezone: true }` + `defaultNow()`; add `updatedAt` only where a
  spec needs it.
- **Keep it flat:** no polymorphic tables, no premature join tables — model
  exactly what the 2-3 specs need, nothing speculative.

Then: `pnpm db:generate`, read the new file in `src/db/migrations/` (it must
only CREATE the new tables — a generated DROP/ALTER of existing tables means
the schema edit went wrong; fix `schema.ts` and regenerate before applying),
then `pnpm db:migrate`.

## Factories recipe (sub-step 4d)

`src/db/factories.ts` — one `make<Entity>()` per table, same shape as the
existing `makeUser()`: pure object builders (no db access), a module counter
for uniqueness, `Partial<New<Entity>>` overrides spread last:

```ts
export type NewTrip = typeof trips.$inferInsert;

export function makeTrip(
  userId: string,
  overrides: Partial<NewTrip> = {},
): NewTrip {
  counter += 1;
  return {
    userId,
    title: `Sample Trip ${counter}`,
    status: "draft",
    ...overrides,
  };
}
```

Required foreign keys have no honest default — make them a required function
parameter (like `userId` above) so the compiler forces the caller to pass a
real id; never fall back to `""`. Values should look realistic
("Sample Trip 3"), not like line noise ("test1").

## Seed recipe (sub-step 4d)

Grow `scripts/seed.ts` with the domain: keep its existing shape (idempotence
check first — skip when data exists; `console.log` a summary; exit codes).
Insert **linked** rows: the demo user, then 2-3 rows per entity chained by
real foreign keys (`.returning()` gives you inserted ids to link children).
The result must let someone sign in at `pnpm dev` and see a believable,
non-empty product — that is the acceptance bar for seed data.

Type note: tsconfig has `noUncheckedIndexedAccess`, so indexing a
`.returning()` array (`rows[0]`, or `const [row] = ...`) is
`T | undefined` and `tsc` (part of `pnpm lint`) rejects unguarded use of
its fields. Guard once with a tiny helper instead of sprinkling `!`:

```ts
function must<T>(row: T | undefined, what: string): T {
  if (row === undefined) throw new Error(`Seed insert returned no ${what}`);
  return row;
}
const demoUser = must(insertedUsers[0], "user");
```

Prove it with `pnpm db:reset` (drops `.pglite/`, re-migrates, re-seeds) and
check the log lists your new rows.
