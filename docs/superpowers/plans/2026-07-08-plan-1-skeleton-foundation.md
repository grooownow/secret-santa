# Liftkit Plan 1: Skeleton Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A buyer-facing repo foundation: clone → `pnpm bootstrap` → dev server runs, DB migrated & seeded, all quality gates green locally and in CI.

**Architecture:** Next.js App Router (single codebase, server side = backend) with FSD-lite folder structure enforced by ESLint boundaries; oxlint carries the bulk of lint rules, ESLint only the architectural layer; Drizzle ORM over PGlite by default (remote Postgres via env switch). Bootstrap is a bash script with a non-interactive `--ci` mode reused by the CI golden-path job.

**Tech Stack:** Next.js (App Router) · TypeScript strict · Tailwind v4 · Drizzle ORM · PGlite (`@electric-sql/pglite`) · postgres-js (remote mode) · zod · Vitest · oxlint + ESLint (flat) + Prettier · lefthook · GitHub Actions.

**Scope note:** This plan covers spec §5.1 (partially: stack, DB, structure), §5.3 (bootstrap), §5.7 (architecture + lint) and the CI base of §8. Auth, test-harness levels 2–3, security/observability (§5.8), design tokens/shadcn, analytics slot → Plan 2. Skills/docs-rules/playbooks → Plan 3.

**Repo note:** Work happens in `/Users/ekaterinapustovaa/Documents/Pet-projects/liftkit` (existing git repo, `main`). Internal docs (`docs/superpowers/`, `docs/marketing/`) are NOT part of the shipped template — exclusion happens in Plan 4 (publish step). Do not touch them here.

## Global Constraints

- Everything in the repo is **English**: code, comments, docs, commit messages.
- Conventional commits (`feat:`, `chore:`, `test:`, `ci:`, …).
- Package manager: **pnpm only**. Node **>= 22** (LTS).
- TypeScript **strict**; `tsc --noEmit` must stay green after every task.
- `pnpm lint` = oxlint → eslint → prettier --check → tsc --noEmit; must be green at every commit.
- Install latest stable versions (`@latest`) — do not pin to versions from this document.
- Never edit an applied DB migration; generate a new one.
- No `console.log` in `src/` (allowed in `scripts/`).

---

### Task 1: Base Next.js scaffold

**Files:**

- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `.nvmrc`, `.gitignore`, `.env.example`
- Create: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`

**Interfaces:**

- Produces: `pnpm dev` / `pnpm build` working app; path alias `@/*` → `src/*`; scripts `dev`, `build`, `start`, `typecheck`.

- [ ] **Step 1: Create package.json and install deps**

```bash
cd /Users/ekaterinapustovaa/Documents/Pet-projects/liftkit
corepack enable && corepack use pnpm@latest
pnpm add next@latest react@latest react-dom@latest
pnpm add -D typescript @types/node @types/react @types/react-dom tailwindcss @tailwindcss/postcss postcss
```

Then edit `package.json` — set:

```json
{
  "name": "liftkit",
  "version": "0.1.0",
  "private": true,
  "engines": { "node": ">=22" },
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "typecheck": "tsc --noEmit"
  }
}
```

(keep the `packageManager` field corepack wrote and the dependency blocks pnpm wrote).

- [ ] **Step 2: Write configs**

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

`next.config.ts`:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
};

export default nextConfig;
```

`postcss.config.mjs`:

```js
export default { plugins: { "@tailwindcss/postcss": {} } };
```

`.nvmrc`: `22`

`.gitignore`:

```
node_modules/
.next/
.env
.env.local
.pglite/
coverage/
*.tsbuildinfo
```

`.env.example`:

```
# Database: pglite (default, zero deps) | remote (needs DATABASE_URL)
LIFTKIT_DB=pglite
# DATABASE_URL=postgres://liftkit:liftkit@localhost:5432/liftkit
```

- [ ] **Step 3: Write the app shell**

`src/app/globals.css`:

```css
@import "tailwindcss";
```

`src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Liftkit",
  description: "Agent-native SaaS starter",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

`src/app/page.tsx`:

```tsx
export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <h1 className="text-2xl font-semibold">
        Liftkit skeleton — run /liftoff in Claude Code
      </h1>
    </main>
  );
}
```

- [ ] **Step 4: Verify build and typecheck**

Run: `pnpm build && pnpm typecheck`
Expected: build succeeds, typecheck exits 0.

Run: `pnpm dev` (briefly), open http://localhost:3000 — page renders the headline. Stop the server.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: base Next.js + TypeScript strict + Tailwind scaffold"
```

---

### Task 2: Format & lint toolchain (oxlint + ESLint + Prettier)

**Files:**

- Create: `.oxlintrc.json`, `eslint.config.mjs`, `.prettierrc`, `.prettierignore`
- Modify: `package.json` (scripts)

**Interfaces:**

- Produces: `pnpm lint` (the single gate command: oxlint → eslint → prettier check → tsc), `pnpm format`.

- [ ] **Step 1: Install**

```bash
pnpm add -D oxlint eslint eslint-plugin-oxlint @next/eslint-plugin-next typescript-eslint eslint-plugin-boundaries prettier prettier-plugin-tailwindcss
```

- [ ] **Step 2: Write configs**

`.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["typescript", "react", "nextjs", "import", "jsx-a11y"],
  "categories": {
    "correctness": "error",
    "suspicious": "error",
    "perf": "warn"
  },
  "rules": { "no-console": "error" },
  "overrides": [{ "files": ["scripts/**"], "rules": { "no-console": "off" } }]
}
```

`.prettierrc`:

```json
{ "plugins": ["prettier-plugin-tailwindcss"] }
```

`.prettierignore`:

```
.next/
node_modules/
pnpm-lock.yaml
src/db/migrations/
```

`eslint.config.mjs` (base — boundaries rules are added in Task 3):

```js
import tseslint from "typescript-eslint";
import nextPlugin from "@next/eslint-plugin-next";
import oxlint from "eslint-plugin-oxlint";

export default tseslint.config(
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts"] },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [tseslint.configs.recommended],
    plugins: { "@next/next": nextPlugin },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      "no-restricted-properties": [
        "error",
        {
          object: "window",
          property: "location",
          message:
            "Use next/navigation (useRouter/redirect) instead of full page loads.",
        },
      ],
      "no-restricted-globals": [
        "error",
        {
          name: "location",
          message: "Use next/navigation instead of full page loads.",
        },
      ],
    },
  },
  ...oxlint.configs["flat/recommended"],
);
```

- [ ] **Step 3: Add the single gate script**

In `package.json` scripts:

```json
{
  "lint": "oxlint . && eslint . && prettier --check . && tsc --noEmit",
  "format": "prettier --write ."
}
```

Run: `pnpm format` (normalize everything once), then `pnpm lint`.
Expected: exits 0.

- [ ] **Step 4: Prove the gates catch violations**

Create `src/app/violation.tsx`:

```tsx
export function Violation() {
  console.log("nope");
  return <a href="/somewhere">internal link via a</a>;
}
```

Run: `pnpm lint`
Expected: FAIL — oxlint flags `no-console`; ESLint flags `@next/next/no-html-link-for-pages`.

Delete the file: `rm src/app/violation.tsx`. Run `pnpm lint` — green again.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: lint/format toolchain — oxlint, ESLint (flat), Prettier, single pnpm lint gate"
```

---

### Task 3: FSD-lite structure with enforced boundaries

**Files:**

- Create: `src/features/.gitkeep`, `src/components/ui/.gitkeep`, `src/lib/.gitkeep`, `src/db/.gitkeep`
- Modify: `eslint.config.mjs`

**Interfaces:**

- Produces: import-direction rules (spec §5.7): `app → features → shared(components|lib|db)`; cross-feature imports only via the slice's `index.ts`.

- [ ] **Step 1: Create the folders**

```bash
mkdir -p src/features src/components/ui src/lib src/db
touch src/features/.gitkeep src/components/ui/.gitkeep src/lib/.gitkeep src/db/.gitkeep
```

- [ ] **Step 2: Add boundaries config to `eslint.config.mjs`**

Add to the main config object (imports at top: `import boundaries from "eslint-plugin-boundaries";`):

```js
    plugins: { "@next/next": nextPlugin, boundaries },
    settings: {
      "boundaries/include": ["src/**/*"],
      "boundaries/elements": [
        { type: "app", pattern: "src/app/**" },
        { type: "feature", pattern: "src/features/*", capture: ["featureName"] },
        { type: "shared", pattern: ["src/components/**", "src/lib/**", "src/db/**"] },
      ],
    },
```

and to `rules`:

```js
      "boundaries/element-types": [
        "error",
        {
          default: "disallow",
          message: "${file.type} may not import ${dependency.type} (see docs/rules/architecture.md)",
          rules: [
            { from: "app", allow: ["feature", "shared"] },
            { from: "feature", allow: ["shared", ["feature", { featureName: "${from.featureName}" }]] },
            { from: "shared", allow: ["shared"] },
          ],
        },
      ],
      "boundaries/entry-point": [
        "error",
        {
          default: "allow",
          rules: [
            {
              target: [["feature", { featureName: "!${from.featureName}" }]],
              allow: ["index.ts", "index.tsx"],
            },
          ],
        },
      ],
```

- [ ] **Step 3: Prove boundaries fire**

Create the violating fixtures:

`src/lib/bad-import.ts`:

```ts
import { placeholder } from "@/features/demo";
export const x = placeholder;
```

`src/features/demo/index.ts`:

```ts
export const placeholder = "demo";
```

Run: `pnpm lint`
Expected: FAIL — `boundaries/element-types` on `src/lib/bad-import.ts` (shared must not import feature).

Remove the fixtures: `rm -rf src/lib/bad-import.ts src/features/demo`. Run `pnpm lint` — green.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: FSD-lite structure with ESLint-enforced import boundaries"
```

---

### Task 4: Vitest + typed env (zod)

**Files:**

- Create: `vitest.config.ts`, `src/lib/env.ts`, `src/lib/env.test.ts`
- Modify: `package.json` (scripts)

**Interfaces:**

- Produces: `parseEnv(raw: NodeJS.ProcessEnv): Env` and `env` singleton — `Env = { NODE_ENV: "development"|"test"|"production"; LIFTKIT_DB: "pglite"|"remote"; DATABASE_URL?: string; PGLITE_DATA_DIR: string }`. Script `pnpm test`.

- [ ] **Step 1: Install and configure Vitest**

```bash
pnpm add -D vitest
pnpm add zod
```

`vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: { environment: "node", include: ["src/**/*.test.ts"] },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
```

`package.json` scripts: add `"test": "vitest run"`.

- [ ] **Step 2: Write the failing test**

`src/lib/env.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseEnv } from "./env";

describe("parseEnv", () => {
  it("defaults to pglite mode", () => {
    const env = parseEnv({});
    expect(env.LIFTKIT_DB).toBe("pglite");
    expect(env.PGLITE_DATA_DIR).toBe(".pglite");
  });

  it("requires DATABASE_URL in remote mode", () => {
    expect(() => parseEnv({ LIFTKIT_DB: "remote" })).toThrow(/DATABASE_URL/);
  });

  it("accepts a valid remote config", () => {
    const env = parseEnv({
      LIFTKIT_DB: "remote",
      DATABASE_URL: "postgres://liftkit:liftkit@localhost:5432/liftkit",
    });
    expect(env.DATABASE_URL).toContain("5432");
  });
});
```

Run: `pnpm test`
Expected: FAIL — `./env` does not exist.

- [ ] **Step 3: Implement**

`src/lib/env.ts`:

```ts
import { z } from "zod";

const schema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    LIFTKIT_DB: z.enum(["pglite", "remote"]).default("pglite"),
    DATABASE_URL: z.string().url().optional(),
    PGLITE_DATA_DIR: z.string().default(".pglite"),
  })
  .superRefine((val, ctx) => {
    if (val.LIFTKIT_DB === "remote" && !val.DATABASE_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["DATABASE_URL"],
        message: "DATABASE_URL is required when LIFTKIT_DB=remote",
      });
    }
  });

export type Env = z.infer<typeof schema>;

export function parseEnv(raw: NodeJS.ProcessEnv): Env {
  const result = schema.safeParse(raw);
  if (!result.success) {
    const details = result.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("\n  ");
    throw new Error(`Invalid environment:\n  ${details}`);
  }
  return result.data;
}

export const env: Env = parseEnv(process.env);
```

- [ ] **Step 4: Verify green**

Run: `pnpm test && pnpm lint`
Expected: 3 tests pass; lint green.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: vitest setup and zod-validated typed env (fail fast on misconfig)"
```

---

### Task 5: Drizzle + PGlite/remote database layer

**Files:**

- Create: `drizzle.config.ts`, `src/db/schema.ts`, `src/db/client.ts`, `src/db/client.test.ts`, `src/db/migrations/` (generated)
- Modify: `package.json` (scripts)

**Interfaces:**

- Produces: `users` table (`id: uuid pk`, `email: text unique not null`, `name: text`, `createdAt: timestamptz not null`); `createDb(env: Env)` returning a Drizzle instance; `db` singleton; scripts `db:generate`, `db:migrate`.

- [ ] **Step 1: Install**

```bash
pnpm add drizzle-orm @electric-sql/pglite postgres
pnpm add -D drizzle-kit
```

- [ ] **Step 2: Schema and drizzle-kit config**

`src/db/schema.ts`:

```ts
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
```

`drizzle.config.ts`:

```ts
import { defineConfig } from "drizzle-kit";

const remote = process.env.LIFTKIT_DB === "remote";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  ...(remote
    ? { dbCredentials: { url: process.env.DATABASE_URL ?? "" } }
    : {
        driver: "pglite",
        dbCredentials: { url: process.env.PGLITE_DATA_DIR ?? ".pglite" },
      }),
});
```

`package.json` scripts: add

```json
{
  "db:generate": "drizzle-kit generate",
  "db:migrate": "drizzle-kit migrate"
}
```

Run: `pnpm db:generate`
Expected: a migration SQL file appears under `src/db/migrations/`.

- [ ] **Step 3: Write the failing client test**

`src/db/client.test.ts` (in-memory PGlite, migrations applied programmatically):

```ts
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { beforeAll, describe, expect, it } from "vitest";
import { users } from "./schema";

describe("database layer", () => {
  const client = new PGlite(); // in-memory
  const db = drizzle(client, { schema: { users } });

  beforeAll(async () => {
    await migrate(db, { migrationsFolder: "./src/db/migrations" });
  });

  it("inserts and reads a user", async () => {
    await db.insert(users).values({ email: "test@liftkit.dev", name: "Test" });
    const rows = await db.select().from(users);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.email).toBe("test@liftkit.dev");
  });

  it("enforces unique email", async () => {
    await expect(
      db.insert(users).values({ email: "test@liftkit.dev" }),
    ).rejects.toThrow();
  });
});
```

Run: `pnpm test`
Expected: db tests PASS if schema/migration correct (env test unaffected). If migration folder empty — FAIL; fix Step 2 first.

- [ ] **Step 4: Implement the runtime client factory**

`src/db/client.ts`:

```ts
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env, type Env } from "@/lib/env";
import * as schema from "./schema";

export function createDb(config: Env) {
  if (config.LIFTKIT_DB === "remote") {
    const sql = postgres(config.DATABASE_URL as string);
    return drizzlePostgres(sql, { schema });
  }
  const client = new PGlite(config.PGLITE_DATA_DIR);
  return drizzlePglite(client, { schema });
}

export const db = createDb(env);
```

Run: `pnpm test && pnpm lint`
Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: drizzle schema, migrations, PGlite-default db client with remote switch"
```

---

### Task 6: Seed script with shared factories

**Files:**

- Create: `src/db/factories.ts`, `src/db/factories.test.ts`, `scripts/seed.ts`
- Modify: `package.json` (scripts)

**Interfaces:**

- Consumes: `createDb`, `users` from Task 5.
- Produces: `makeUser(overrides?: Partial<NewUser>): NewUser` (`NewUser = typeof users.$inferInsert`); script `pnpm db:seed` (idempotent).

- [ ] **Step 1: Write the failing factory test**

`src/db/factories.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { makeUser } from "./factories";

describe("makeUser", () => {
  it("generates unique emails", () => {
    expect(makeUser().email).not.toBe(makeUser().email);
  });

  it("applies overrides", () => {
    expect(makeUser({ email: "fixed@liftkit.dev" }).email).toBe(
      "fixed@liftkit.dev",
    );
  });
});
```

Run: `pnpm test` — Expected: FAIL (`./factories` missing).

- [ ] **Step 2: Implement factory and seed**

`src/db/factories.ts`:

```ts
import type { users } from "./schema";

export type NewUser = typeof users.$inferInsert;

let counter = 0;

export function makeUser(overrides: Partial<NewUser> = {}): NewUser {
  counter += 1;
  return {
    email: `user${counter}-${Date.now()}@example.dev`,
    name: `Seed User ${counter}`,
    ...overrides,
  };
}
```

`scripts/seed.ts`:

```ts
import { db } from "@/db/client";
import { makeUser } from "@/db/factories";
import { users } from "@/db/schema";

async function main() {
  const existing = await db.select().from(users);
  if (existing.length > 0) {
    console.log(`Seed skipped: ${existing.length} users already present.`);
    return;
  }
  await db
    .insert(users)
    .values([makeUser({ email: "demo@liftkit.dev", name: "Demo User" })]);
  console.log("Seeded 1 demo user.");
}

main().then(() => process.exit(0));
```

`package.json` scripts: add `"db:seed": "tsx scripts/seed.ts"` and install: `pnpm add -D tsx`.

- [ ] **Step 3: Verify**

Run: `pnpm test` — factory tests PASS.
Run: `pnpm db:migrate && pnpm db:seed` — Expected: "Seeded 1 demo user."
Run again: `pnpm db:seed` — Expected: "Seed skipped: 1 users already present." (idempotent).

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: data factories shared by tests and idempotent seed script"
```

---

### Task 7: Bootstrap script

**Files:**

- Create: `scripts/bootstrap`
- Modify: `package.json` (scripts)

**Interfaces:**

- Consumes: `db:migrate`, `db:seed` from Tasks 5–6.
- Produces: `pnpm bootstrap` (interactive) and `scripts/bootstrap --ci` (non-interactive, fails instead of prompting) — used by CI golden path (Task 9).

- [ ] **Step 1: Write the script**

`scripts/bootstrap`:

```bash
#!/usr/bin/env bash
set -euo pipefail

CI_MODE=false
[[ "${1:-}" == "--ci" ]] && CI_MODE=true

say()  { printf "\n\033[1m%s\033[0m\n" "$1"; }
fail() { printf "\n❌ %s\n   → %s\n" "$1" "$2"; exit 1; }

offer_install() { # $1=name $2=brew formula $3=manual url
  if $CI_MODE; then fail "$1 is missing" "Install it: $3"; fi
  if command -v brew >/dev/null 2>&1; then
    read -r -p "$1 is missing. Install via Homebrew? [y/N] " answer
    if [[ "$answer" =~ ^[Yy]$ ]]; then brew install "$2"; return; fi
  fi
  fail "$1 is required" "Install it manually: $3"
}

say "Liftkit bootstrap — checking prerequisites"

command -v git  >/dev/null 2>&1 || offer_install "git" "git" "https://git-scm.com/downloads"
command -v node >/dev/null 2>&1 || offer_install "Node.js" "node" "https://nodejs.org"

NODE_MAJOR=$(node -e 'console.log(process.versions.node.split(".")[0])')
[[ "$NODE_MAJOR" -ge 22 ]] || fail "Node >= 22 required (found $(node -v))" "Update: https://nodejs.org or 'nvm install 22'"

command -v pnpm >/dev/null 2>&1 || corepack enable || offer_install "pnpm" "pnpm" "https://pnpm.io/installation"

say "Installing dependencies"
pnpm install --frozen-lockfile 2>/dev/null || pnpm install

if [[ ! -f .env ]]; then
  cp .env.example .env
  say "Created .env from .env.example (defaults: PGlite, zero external services)"
fi

say "Initializing local database (PGlite) — migrate + seed"
pnpm db:migrate
pnpm db:seed

say "✅ Bootstrap complete."
printf "Next step: open Claude Code in this folder and type \033[1m/liftoff\033[0m\n"
```

```bash
chmod +x scripts/bootstrap
```

`package.json` scripts: add `"bootstrap": "./scripts/bootstrap"`.

- [ ] **Step 2: Verify both modes**

Run: `rm -rf .pglite .env && pnpm bootstrap`
Expected: prerequisites pass, `.env` created, migrate + seed run, final message shows `/liftoff`.

Run: `rm -rf .pglite .env && ./scripts/bootstrap --ci`
Expected: same result, zero prompts.

Run: `pnpm lint` — green (script is bash; not linted by TS chain).

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: guided bootstrap script with non-interactive --ci mode"
```

---

### Task 8: Optional docker-compose (remote mode)

**Files:**

- Create: `docker-compose.yml`

**Interfaces:**

- Produces: optional local Postgres matching `.env.example`'s commented `DATABASE_URL`.

- [ ] **Step 1: Write the compose file**

`docker-compose.yml`:

```yaml
# OPTIONAL: real local Postgres for those who prefer it over the default PGlite.
# Usage: docker compose up -d, then set in .env:
#   LIFTKIT_DB=remote
#   DATABASE_URL=postgres://liftkit:liftkit@localhost:5432/liftkit
services:
  db:
    image: postgres:17-alpine
    environment:
      POSTGRES_USER: liftkit
      POSTGRES_PASSWORD: liftkit
      POSTGRES_DB: liftkit
    ports:
      - "5432:5432"
    volumes:
      - liftkit-pgdata:/var/lib/postgresql/data
volumes:
  liftkit-pgdata:
```

- [ ] **Step 2: Verify (only if Docker is available locally; otherwise CI covers remote mode in Task 9)**

Run: `docker compose up -d && LIFTKIT_DB=remote DATABASE_URL=postgres://liftkit:liftkit@localhost:5432/liftkit pnpm db:migrate && docker compose down`
Expected: migration applies against real Postgres.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: optional docker-compose Postgres for remote db mode"
```

---

### Task 9: CI workflow with golden path

**Files:**

- Create: `.github/workflows/ci.yml`

**Interfaces:**

- Consumes: `pnpm lint`, `pnpm test`, `pnpm build`, `scripts/bootstrap --ci`.
- Produces: required checks `quality`, `golden-path`, `remote-db`.

- [ ] **Step 1: Write the workflow**

`.github/workflows/ci.yml`:

```yaml
name: CI
on:
  push: { branches: [main] }
  pull_request:

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm test

  golden-path:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - name: Bootstrap from clean checkout (buyer's first-run path)
        run: ./scripts/bootstrap --ci
      - run: pnpm build

  remote-db:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:17-alpine
        env:
          POSTGRES_USER: liftkit
          POSTGRES_PASSWORD: liftkit
          POSTGRES_DB: liftkit
        ports: ["5432:5432"]
        options: >-
          --health-cmd "pg_isready -U liftkit" --health-interval 5s
          --health-timeout 5s --health-retries 10
    env:
      LIFTKIT_DB: remote
      DATABASE_URL: postgres://liftkit:liftkit@localhost:5432/liftkit
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm db:migrate
      - run: pnpm test
```

- [ ] **Step 2: Verify locally what can be verified**

Run: `pnpm lint && pnpm test && pnpm build && rm -rf .pglite .env && ./scripts/bootstrap --ci`
Expected: everything green — same commands CI will run.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "ci: quality, golden-path bootstrap, and remote-db workflows"
```

---

### Task 10: Pre-commit hook + minimal README

**Files:**

- Create: `lefthook.yml`, `README.md`
- Modify: `package.json`

**Interfaces:**

- Produces: fast pre-commit gate (oxlint + prettier on staged files); README quickstart matching the bootstrap flow.

- [ ] **Step 1: Install and configure lefthook**

```bash
pnpm add -D lefthook
```

`lefthook.yml`:

```yaml
pre-commit:
  parallel: true
  commands:
    oxlint:
      glob: "*.{ts,tsx}"
      run: pnpm oxlint {staged_files}
    prettier:
      glob: "*.{ts,tsx,css,md,json,yml}"
      run: pnpm prettier --check {staged_files}
```

`package.json` scripts: add `"prepare": "lefthook install"`. Run `pnpm lefthook install`.

- [ ] **Step 2: Verify the hook fires**

```bash
echo 'export const bad = () => { console.log("x"); };' > src/lib/hook-check.ts
git add src/lib/hook-check.ts
git commit -m "test: should be blocked" || echo "HOOK BLOCKED AS EXPECTED"
rm src/lib/hook-check.ts && git reset
```

Expected: commit blocked by oxlint `no-console`; the echo line prints.

- [ ] **Step 3: Write README**

`README.md`:

````markdown
# Liftkit

Agent-native SaaS starter for Claude Code. One command, one guided hour:
from idea to a running, tested app.

## Quickstart

Prerequisites: Node >= 22, git, [Claude Code](https://code.claude.com).

```bash
pnpm bootstrap
```
````

Then open Claude Code in this folder and type `/liftoff`.
The onboarding agent takes it from there: your idea → PRD → specs → a running app.

## Under the hood

- Next.js (App Router) + TypeScript strict + Tailwind
- Drizzle ORM + PGlite locally (zero external services); `LIFTKIT_DB=remote` for real Postgres
- Feature-first architecture enforced by lint (`docs/rules/architecture.md` — Plan 3)
- One gate: `pnpm lint` (oxlint → ESLint → Prettier → tsc) + `pnpm test`

````

- [ ] **Step 4: Final full-gate run and commit**

Run: `pnpm lint && pnpm test && pnpm build`
Expected: all green.

```bash
git add -A && git commit -m "feat: lefthook pre-commit gate and quickstart README"
````

---

## Plan 1 Definition of Done

- Clean clone → `./scripts/bootstrap --ci` → `pnpm build` succeeds (CI golden-path job green).
- `pnpm lint` and `pnpm test` green; violations (console.log, internal `<a>`, cross-boundary import) provably fail the gates.
- DB works in both modes: PGlite (default, zero setup) and remote Postgres (CI job).
- Seed is idempotent; factories shared between seed and tests.
