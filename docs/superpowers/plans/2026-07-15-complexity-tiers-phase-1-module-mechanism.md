# Complexity Tiers — Phase 1: Module Mechanism + `persistence` Extraction — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Invert the template so a fresh clone is a minimal **Landing** core, extract the db+auth stack into `modules/persistence/` installed by an agent-followed `module.md` apply-plan, and prove in CI that applying `persistence` to a clean core reproduces today's App and passes all gates.

**Architecture:** The canonical `src/` shrinks to Landing (no db/auth). The heavy stack lives under `modules/persistence/` as (1) verbatim `files/` copied into a project on install, (2) `fragments/` merged into shared core files, and (3) a `module.md` apply-plan (numbered prompt-plan, mirroring `CHANGELOG.md`'s idiom) the agent follows. A deterministic `scripts/apply-module.ts` performs the *mechanical* half of an apply (copy files, patch `package.json`, splice fragments at markers) so CI can materialize App without an agent; the `module.md` apply-plan wraps that script with the *judgment* wiring steps a real, already-modified project needs. CI splits into a Landing-quality job and a materialized-App job.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Drizzle + PGlite/postgres, next-auth v5, Vitest, Playwright, oxlint/eslint/prettier, pnpm, tsx, GitHub Actions.

## Global Constraints

- Node `>=22`; pnpm `11.10.0` (pinned `packageManager`). Copy verbatim.
- Conventional Commits enforced by a `PreToolUse` hook and lefthook `commit-msg`. Type ∈ `feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert`. **Never** put a bare inline commit subject the hook can misparse — write the message to a file and `git commit -F <file>` when it contains shell metacharacters.
- Hard invariants enforced at write-time (`scripts/hooks/pretooluse.ts`): #1 no internal `<a href>`/`window.location` (use `next/link`); #2 no network/db in `src/middleware.ts`; #4 zod-validate every server action/route input; #5 Conventional Commits. Invariants #2/#4 go **inert** in Landing (no middleware / no server actions) — do not delete the hook.
- Every change ships with a test proven able to fail (`docs/rules/testing.md`).
- `pnpm lint` = `oxlint . && eslint . && prettier --check . && tsc --noEmit`. `prettier --check .` runs in lefthook pre-commit — run `pnpm format` before every commit.
- Chat with the user in Russian; all repo artifacts (code, docs, commit messages) in English.
- Work on branch `docs/complexity-tiers-design` (already checked out) or a fresh `feat/complexity-tiers-phase-1` — confirm with the user before switching.

## File Structure

**New:**
- `docs/rules/modules.md` — the module-format contract (what a `modules/<name>/` dir must contain).
- `modules/persistence/module.md` — metadata frontmatter + numbered apply-plan.
- `modules/persistence/files/**` — verbatim copies of the extracted db+auth source (see Task 3 list).
- `modules/persistence/fragments/{env-schema.md,package-deps.md,env-example.md,landing-signin-link.md}` — spliceable snippets.
- `scripts/apply-module.ts` — deterministic mechanical applier (`pnpm module:apply <name>`).
- `scripts/apply-module.test.ts` — unit test on a temp fixture.
- `scripts/validate-modules.ts` + `scripts/validate-modules.test.ts` — module-format validator (`pnpm modules:validate`).
- `src/core-boundary.test.ts` — guard: Landing core imports nothing from the persistence module.

**Modified (the inversion):**
- `src/lib/env.ts` — remove the auth/seed block behind a splice marker (moves to fragment).
- `src/app/page.tsx` — drop the `/signin` link (returned by the module on install).
- `package.json` — remove persistence deps + `db:*` scripts (moved to module); add `modules:validate`, `module:apply`.
- `scripts/bootstrap` — make the migrate+seed steps conditional on `drizzle.config.ts` existing.
- `.env.example` — move the auth/seed/db block to the module's env fragment.
- `tsconfig.json`, `eslint.config.mjs`, `.prettierignore`, `vitest.config.ts` — exclude `modules/**` from the core's compile/lint/test surface.
- `.github/workflows/ci.yml` — split into Landing-quality + materialized-App jobs.
- `CHANGELOG.md`, `README.md`, `docs/rules/architecture.md`, `docs/decisions/0002-*.md` — actualize.

**Removed from core (git rm — content preserved under `modules/persistence/files/`):** see Task 3.

---

### Task 1: Module-format contract + validator (green, pure addition)

**Files:**
- Create: `docs/rules/modules.md`
- Create: `scripts/validate-modules.ts`
- Test: `scripts/validate-modules.test.ts`
- Modify: `package.json` (add `"modules:validate": "tsx scripts/validate-modules.ts"`)

**Interfaces:**
- Produces: `validateModules(root: string): { name: string; errors: string[] }[]` — one entry per `modules/<name>/` dir; `errors` empty ⇒ valid. A module is valid when `module.md` exists with frontmatter keys `name`, `description`, `depends-on` (array, may be empty), `presets` (non-empty array) and contains a `## Apply plan` heading.

- [ ] **Step 1: Write the failing test**

```ts
// scripts/validate-modules.test.ts
import { describe, it, expect } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validateModules } from "./validate-modules";

function scratchModule(md: string): string {
  const root = mkdtempSync(join(tmpdir(), "mods-"));
  mkdirSync(join(root, "modules", "demo"), { recursive: true });
  writeFileSync(join(root, "modules", "demo", "module.md"), md);
  return root;
}

describe("validateModules", () => {
  it("accepts a well-formed module", () => {
    const root = scratchModule(
      `---\nname: demo\ndescription: d\ndepends-on: []\npresets: [App]\n---\n\n## Apply plan\n\n> 1. do it\n`,
    );
    expect(validateModules(root)).toEqual([{ name: "demo", errors: [] }]);
  });

  it("rejects a module missing the apply plan and presets", () => {
    const root = scratchModule(`---\nname: demo\ndescription: d\ndepends-on: []\n---\n`);
    const [res] = validateModules(root);
    expect(res.errors).toContain("missing frontmatter key: presets");
    expect(res.errors).toContain("missing '## Apply plan' section");
  });

  it("returns [] when there is no modules/ dir", () => {
    const root = mkdtempSync(join(tmpdir(), "empty-"));
    expect(validateModules(root)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run scripts/validate-modules.test.ts`
Expected: FAIL — `Cannot find module './validate-modules'`.

- [ ] **Step 3: Implement `scripts/validate-modules.ts`**

```ts
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const REQUIRED_KEYS = ["name", "description", "depends-on", "presets"] as const;

function parseFrontmatter(md: string): Record<string, string> {
  const m = md.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  const out: Record<string, string> = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^([\w-]+):\s*(.*)$/);
    if (kv) out[kv[1]] = kv[2].trim();
  }
  return out;
}

export function validateModules(
  root: string,
): { name: string; errors: string[] }[] {
  const dir = join(root, "modules");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((n) => statSync(join(dir, n)).isDirectory())
    .map((name) => {
      const errors: string[] = [];
      const mdPath = join(dir, name, "module.md");
      if (!existsSync(mdPath)) {
        return { name, errors: ["missing module.md"] };
      }
      const md = readFileSync(mdPath, "utf8");
      const fm = parseFrontmatter(md);
      for (const k of REQUIRED_KEYS) {
        if (!(k in fm)) errors.push(`missing frontmatter key: ${k}`);
      }
      if ("presets" in fm && (fm.presets === "" || fm.presets === "[]")) {
        errors.push("presets must be non-empty");
      }
      if (!/^##\s+Apply plan\s*$/m.test(md)) {
        errors.push("missing '## Apply plan' section");
      }
      return { name, errors };
    });
}

// CLI: exit non-zero if any module is invalid.
if (process.argv[1] && process.argv[1].endsWith("validate-modules.ts")) {
  const results = validateModules(process.cwd());
  const bad = results.filter((r) => r.errors.length > 0);
  for (const r of bad) {
    console.error(`✗ modules/${r.name}: ${r.errors.join("; ")}`);
  }
  console.log(`Validated ${results.length} module(s); ${bad.length} invalid.`);
  process.exit(bad.length === 0 ? 0 : 1);
}
```

- [ ] **Step 4: Write `docs/rules/modules.md`** — the contract (mirror the tone of the sibling rule files).

```markdown
# Modules

**Applies to:** any `modules/<name>/` directory and any skill that installs one.

A **module** is an optional capability a project adds on top of the Landing
core (db, auth, billing …). The Landing core is the canonical `src/`; modules
are not compiled, linted, or tested as part of the core (they live outside the
`tsconfig`/eslint/vitest surface) — they are materialized into a project only
when installed.

## Layout

    modules/<name>/
      module.md     # frontmatter + "## Apply plan" (required)
      files/        # verbatim files copied into the project on install
      fragments/    # snippets spliced into shared core files at markers

## `module.md` frontmatter (all required)

- `name` — kebab-case, matches the directory.
- `description` — one line.
- `depends-on` — YAML array of other module names (may be `[]`).
- `presets` — YAML array of presets that include this module (non-empty).

## `## Apply plan`

A numbered, blockquoted prompt-plan an agent follows to install the module —
same idiom as a `CHANGELOG.md` release apply plan. It MUST start by running the
deterministic applier (`pnpm module:apply <name>`, which does the mechanical
copy/patch/splice) and then list the judgment "wiring" steps a real project
needs, ending in a Conventional-Commit commit. `pnpm modules:validate` (CI)
checks this structure.
```

- [ ] **Step 5: Add the script to `package.json`** — insert into `"scripts"`:

```json
"modules:validate": "tsx scripts/validate-modules.ts",
```

- [ ] **Step 6: Run the tests and lint**

Run: `pnpm exec vitest run scripts/validate-modules.test.ts && pnpm modules:validate && pnpm format && pnpm lint`
Expected: tests PASS; `Validated 0 module(s); 0 invalid.`; lint green.

- [ ] **Step 7: Commit**

Write the message to `/tmp/.../scratchpad/msg.txt` and:
```bash
git add docs/rules/modules.md scripts/validate-modules.ts scripts/validate-modules.test.ts package.json
git commit -F <msg-file>   # subject: "feat(modules): module-format contract and validator"
```

---

### Task 2: Exclude `modules/**` from the core compile/lint/test surface

**Files:**
- Modify: `tsconfig.json` (add `"modules"` to `exclude`)
- Modify: `eslint.config.mjs` (add `modules/**` to the global `ignores`)
- Modify: `.prettierignore` (add `modules/**/files/`)
- Modify: `vitest.config.ts` (add `modules/**` to `test.exclude`)

**Interfaces:** none (config only). This must land *before* Task 3 so the copied module files never enter the core's `tsc`/eslint/vitest.

- [ ] **Step 1: Write the failing guard test**

```ts
// scripts/modules-excluded.test.ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

describe("modules/ is outside the core surface", () => {
  it("tsconfig excludes modules", () => {
    const tsconfig = JSON.parse(readFileSync("tsconfig.json", "utf8"));
    expect(tsconfig.exclude).toContain("modules");
  });
  it("prettier ignores module files", () => {
    expect(readFileSync(".prettierignore", "utf8")).toMatch(/^modules\//m);
  });
});
```

- [ ] **Step 2: Run to verify it fails** — `pnpm exec vitest run scripts/modules-excluded.test.ts` → FAIL.

- [ ] **Step 3: Edit the four config files.**
  - `tsconfig.json`: add `"modules"` to the `exclude` array.
  - `eslint.config.mjs`: in the top-level ignores config object, add `"modules/**"`.
  - `.prettierignore`: append a line `modules/`.
  - `vitest.config.ts`: add `"modules/**"` to `test.exclude` (keep the existing defaults — spread `configDefaults.exclude` if referenced).

- [ ] **Step 4: Run tests + lint** — `pnpm exec vitest run scripts/modules-excluded.test.ts && pnpm format && pnpm lint` → PASS/green.

- [ ] **Step 5: Commit** — `build(modules): exclude modules/ from core tsc/eslint/prettier/vitest`.

---

### Task 3: Author `modules/persistence/` (copy files + fragments + apply-plan) — core still App, still green

Copy (do **not** move yet) the db+auth stack into the module, and write its `module.md` + fragments. The core is unchanged, so all gates stay green; the validator now sees one real module.

**Files — copy verbatim into `modules/persistence/files/` (preserve relative paths under `files/`):**
- `src/db/**` (schema, client, factories, `client-lazy.test.ts`, `factories.test.ts`, `migrations/**`)
- `src/lib/auth.ts`, `src/lib/auth.config.ts`, `src/lib/password.ts`, `src/lib/auth.config.test.ts`, `src/lib/auth.credentials.test.ts`
- `src/features/auth/**`, `src/features/profile/**`
- `src/middleware.ts`
- `src/app/api/auth/[...nextauth]/route.ts`, `src/app/signin/**`, `src/app/dashboard/**`
- `scripts/seed.ts`, `drizzle.config.ts`
- `tests/e2e/auth.spec.ts`, `tests/integration/**` (auth-route, profile-action, `helpers/test-db.ts`)

**Files — create fragments:**
- `modules/persistence/fragments/env-schema.md` — the auth/seed/db-remote block removed from `src/lib/env.ts` (lines 8-10, 18-47 region + the two `superRefine` checks), as a copy-pastable snippet with the splice marker it targets.
- `modules/persistence/fragments/package-deps.md` — exact deps/devDeps to add: `@auth/core@^0.41.2`, `@auth/drizzle-adapter@^1.11.2`, `@electric-sql/pglite@^0.5.4`, `bcryptjs@^3.0.3`, `drizzle-orm@^0.45.2`, `next-auth@5.0.0-beta.31`, `postgres@^3.4.9`; dev: `@types/bcryptjs@^3.0.0`, `drizzle-kit@^0.31.10`; scripts: `db:generate`, `db:migrate`, `db:seed`, `db:reset`.
- `modules/persistence/fragments/env-example.md` — the auth/seed/db block for `.env.example`.
- `modules/persistence/fragments/landing-signin-link.md` — the `<Link href="/signin">Sign in</Link>` `CardFooter` block for `src/app/page.tsx`, with its splice marker.

- [ ] **Step 1: Copy the files.** Use `git add`-friendly copies:
```bash
mkdir -p modules/persistence/files
# db + lib + features + middleware + app slices + scripts + config + tests
rsync -R src/db src/lib/auth.ts src/lib/auth.config.ts src/lib/password.ts \
  src/lib/auth.config.test.ts src/lib/auth.credentials.test.ts \
  src/features/auth src/features/profile src/middleware.ts \
  "src/app/api/auth/[...nextauth]/route.ts" src/app/signin src/app/dashboard \
  scripts/seed.ts drizzle.config.ts \
  tests/e2e/auth.spec.ts tests/integration \
  modules/persistence/files/
```
(Verify with `find modules/persistence/files -type f | sort`.)

- [ ] **Step 2: Write the four fragments** — each is the exact text later removed from core (authored precisely in Task 5), wrapped with a fenced code block and a one-line "splice into `<file>` at marker `<!-- module:persistence:<slot> -->`" instruction.

- [ ] **Step 3: Write `modules/persistence/module.md`:**

```markdown
---
name: persistence
description: Database (Drizzle + PGlite/postgres) and auth (next-auth + middleware + signin/dashboard/profile).
depends-on: []
presets: [App, App+Billing]
---

# persistence

Adds the data + auth layer to a Landing project. Depends on nothing; `billing`
depends on this.

## Apply plan

> Install the `persistence` module into this project. Work on a branch
> (`feat/add-persistence`) and commit once at the end.
>
> 1. **Mechanical apply.** Run `pnpm module:apply persistence`. This copies
>    `modules/persistence/files/**` into place, adds the module's deps and
>    `db:*` scripts to `package.json`, and splices the env/schema/signin-link
>    fragments at their markers. Run `pnpm install`.
> 2. **Env.** Copy `modules/persistence/fragments/env-example.md` into your
>    `.env.example` and `.env`; set `AUTH_SECRET` (`openssl rand -base64 33`).
> 3. **Schema & migrations.** Confirm `src/db/schema.ts` compiles with your
>    domain tables, then `pnpm db:migrate` (or `pnpm db:generate` first if you
>    changed the schema) — read the generated SQL before applying.
> 4. **Wiring (judgment).** Confirm the `/signin` link is back on the landing
>    page, `src/lib/env.ts` has the auth block, and `src/middleware.ts` matcher
>    covers your protected routes. Reconcile anything the mechanical apply could
>    not (a landing page you rewrote, a custom `env.ts`).
> 5. **Verify.** `pnpm db:reset && pnpm lint && pnpm test && pnpm test:e2e`.
> 6. Commit as `feat(persistence): add database and auth`.
```

- [ ] **Step 4: Validate + lint** — `pnpm modules:validate && pnpm format && pnpm lint` → `Validated 1 module(s); 0 invalid.`; green. (Core unchanged ⇒ `pnpm test` still green.)

- [ ] **Step 5: Commit** — `feat(modules): author persistence module (files, fragments, apply-plan)`.

---

### Task 4: Deterministic applier `scripts/apply-module.ts` + test

The mechanical half of an install, so CI (and step 1 of the apply-plan) can materialize App reproducibly.

**Files:**
- Create: `scripts/apply-module.ts` — `pnpm module:apply <name>`
- Test: `scripts/apply-module.test.ts`
- Modify: `package.json` (add `"module:apply": "tsx scripts/apply-module.ts"`)

**Interfaces:**
- Produces: `applyModule(name: string, root: string): void`. Effects, in order: (a) copy every file under `modules/<name>/files/` to the same relative path under `root`; (b) merge `package-deps.md`'s deps/devDeps/scripts into `root/package.json`; (c) for each fragment with a splice marker, insert its body at that marker in the target file (idempotent: skip if the body is already present). Throws if a target file lacks the declared marker.

- [ ] **Step 1: Write the failing test** — build a scratch `root` with a fake module (one `files/x.ts`, a `package-deps.md`, and a marker file), run `applyModule`, assert the file landed, the dep is in `package.json`, and the marker was replaced. Assert a second run is a no-op (idempotent).

```ts
// scripts/apply-module.test.ts — sketch; fill concrete fixtures
import { describe, it, expect } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { applyModule } from "./apply-module";

// ... construct root with modules/demo/{files/greet.ts, fragments/deps.md, module.md}
// and a target file with "<!-- module:demo:hook -->"; then:
it("copies files, patches deps, splices markers, and is idempotent", () => {
  // applyModule("demo", root)
  // expect greet.ts copied; expect package.json deps has the entry;
  // expect marker replaced with fragment body;
  // applyModule again → identical content (no double-splice)
});
```

- [ ] **Step 2: Run → FAIL** (`Cannot find module './apply-module'`).

- [ ] **Step 3: Implement `scripts/apply-module.ts`** — file copy walk, `package.json` merge (parse both, union deps/scripts, keep pinned versions from the fragment), marker splice with an "already present" guard. Export `applyModule`; CLI entry runs `applyModule(process.argv[2], process.cwd())`.

- [ ] **Step 4: Run → PASS**; `pnpm format && pnpm lint` green.

- [ ] **Step 5: Commit** — `feat(modules): deterministic module applier (module:apply)`.

---

### Task 5: The inversion — reduce core to Landing (atomic, ends green)

Remove the persistence files from core, shrink `env.ts`/`page.tsx`/`package.json`/`.env.example`/`bootstrap`, add the core-boundary guard, regenerate the lockfile. After this task, `pnpm lint && pnpm test && pnpm build` are green on **Landing**.

**Files:**
- Remove (git rm): every path copied in Task 3 Step 1 (they now live under `modules/persistence/files/`).
- Modify: `src/lib/env.ts`, `src/app/page.tsx`, `package.json`, `.env.example`, `scripts/bootstrap`.
- Create: `src/core-boundary.test.ts`.
- Regenerate: `pnpm-lock.yaml` (via `pnpm install` after deps removed).

- [ ] **Step 1: Write the failing core-boundary guard**

```ts
// src/core-boundary.test.ts
import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";

// The Landing core must not import the persistence stack. Fails loudly if any
// db/auth code leaks back into src/.
describe("Landing core boundary", () => {
  it("has no import of @/db, @/lib/auth, next-auth, or drizzle in src/", () => {
    const hits = execSync(
      "grep -rnE \"from \\\"(@/db|@/lib/auth|next-auth|@auth/|drizzle-orm)\" src || true",
      { encoding: "utf8" },
    ).trim();
    expect(hits, `leaked persistence imports:\n${hits}`).toBe("");
  });
  it("has no src/db, src/middleware.ts, or auth feature slice", () => {
    const hits = execSync(
      "ls src/db src/middleware.ts src/features/auth 2>/dev/null || true",
      { encoding: "utf8" },
    ).trim();
    expect(hits).toBe("");
  });
});
```

- [ ] **Step 2: Run → FAIL** (core still has the persistence stack).

- [ ] **Step 3: `git rm` the persistence paths from core.**
```bash
git rm -r src/db src/features/auth src/features/profile src/app/signin \
  src/app/dashboard "src/app/api/auth" src/middleware.ts \
  src/lib/auth.ts src/lib/auth.config.ts src/lib/password.ts \
  src/lib/auth.config.test.ts src/lib/auth.credentials.test.ts \
  scripts/seed.ts drizzle.config.ts \
  tests/e2e/auth.spec.ts tests/integration
```

- [ ] **Step 4: Shrink `src/lib/env.ts`** — keep `NODE_ENV`, `NEXT_PUBLIC_APP_URL`, observability (`SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `LOG_LEVEL`), analytics (`NEXT_PUBLIC_POSTHOG_KEY`). Remove `LIFTKIT_DB`, `DATABASE_URL`, `PGLITE_DATA_DIR`, the whole Auth + Seed block (lines ~18-47), and **both** `superRefine` checks. Leave a splice marker where the block was:
```ts
    NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
    // <!-- module:persistence:env-schema --> (persistence adds db/auth/seed here)
  });
```
(Drop the now-empty `.superRefine(...)`; the fragment re-adds it.)

- [ ] **Step 5: Shrink `src/app/page.tsx`** — remove the `CardFooter` with the `/signin` `Link` and the now-unused `Link`/`CardFooter` imports; leave a marker:
```tsx
        </CardContent>
        {/* <!-- module:persistence:landing-signin-link --> */}
      </Card>
```

- [ ] **Step 6: Shrink `package.json`** — remove deps `@auth/core`, `@auth/drizzle-adapter`, `@electric-sql/pglite`, `bcryptjs`, `drizzle-orm`, `next-auth`, `postgres`; devDeps `@types/bcryptjs`, `drizzle-kit`; scripts `db:generate`, `db:migrate`, `db:seed`, `db:reset`. Then `pnpm install` to regenerate `pnpm-lock.yaml`.

- [ ] **Step 7: Make `scripts/bootstrap` db-conditional** — replace the unconditional migrate/seed block (lines 89-91) with:
```bash
if [[ -f drizzle.config.ts ]]; then
  say "Initializing local database (PGlite) — migrate + seed"
  pnpm db:migrate
  pnpm db:seed
else
  say "Landing preset — no database to initialize (skipping migrate/seed)"
fi
```

- [ ] **Step 8: Move the `.env.example` auth/seed/db block** into `modules/persistence/fragments/env-example.md` (already drafted in Task 3) and delete it from `.env.example`, keeping app/observability/analytics vars.

- [ ] **Step 9: Fix fallout in core.** Grep for stragglers referencing removed modules (`grep -rnE "@/db|@/features/(auth|profile)|@/lib/auth|requireUser|signOut" src`): the only legitimate core consumer was `src/app/dashboard` and `src/app/page.tsx` (handled). Update `src/lib/env.test.ts` to drop assertions on removed vars. Ensure `tests/e2e/smoke.spec.ts` only touches `/`.

- [ ] **Step 10: Run the full core gate**

Run: `pnpm format && pnpm lint && pnpm test && pnpm build`
Expected: all green — Landing compiles, boundary test PASS, no persistence imports. (e2e: `pnpm test:e2e` runs only `smoke.spec.ts` now — run it too.)

- [ ] **Step 11: Commit** — `refactor(core)!: reduce template to Landing core; persistence lives in modules/` (note the `!` — breaking change to the template's default shape; explain in body).

---

### Task 6: Round-trip proof + CI restructure

Prove that applying `persistence` to the clean Landing core reproduces App and passes the full db/auth/e2e gates — in CI, without an agent.

**Files:**
- Create: `scripts/materialize-app.ts` (or reuse `module:apply persistence` directly) + `scripts/materialize-app.test.ts` — copy repo to a temp dir, `applyModule("persistence")`, `pnpm install`, assert the App files exist and `tsc --noEmit` passes.
- Modify: `.github/workflows/ci.yml`.

**CI shape after this task:**
- `quality` — unchanged commands, now gating **Landing** (`pnpm lint`, `skills:*`, `pnpm test`, `pnpm audit`), **plus a new `pnpm modules:validate` step** (makes `docs/rules/modules.md`'s "validated in CI" claim true — flagged by the Task 1 review).
- `golden-path` — `./scripts/bootstrap --ci` (now the Landing first-run: no db) + `pnpm build`.
- **New `materialized-app`** — checkout → `pnpm install` → `pnpm module:apply persistence` → `pnpm install` → `pnpm db:migrate` → `pnpm test` → `pnpm exec playwright install --with-deps chromium` → `pnpm test:e2e`. This is where the persistence code is compiled and tested.
- `remote-db` — prepend `pnpm module:apply persistence && pnpm install` before `pnpm db:migrate && pnpm test` (keeps the Postgres-service path covered).
- `lighthouse` — prepend `pnpm module:apply persistence && pnpm install` before `pnpm build && pnpm db:reset && lhci`.

- [ ] **Step 1: Write the failing materialize test** — assert that after materialize, `src/db/schema.ts` and `src/middleware.ts` exist in the temp dir and `pnpm exec tsc --noEmit -p <tempdir>` exits 0. Run → FAIL.

- [ ] **Step 2: Implement `scripts/materialize-app.ts`** — copy tracked files to a temp dir (`git archive` or `rsync` excluding `.git`/`node_modules`/`.pglite`), `applyModule("persistence", temp)`. Run → PASS.

- [ ] **Step 3: Edit `.github/workflows/ci.yml`** — add the `materialized-app` job; prepend the apply step to `remote-db` and `lighthouse`; leave `quality`/`golden-path` gating Landing. Keep the standalone `e2e` job only if it still has a Landing e2e to run (smoke) — otherwise fold e2e into `materialized-app`.

- [ ] **Step 4: Validate the workflow locally** — `pnpm module:apply persistence && pnpm install && pnpm db:migrate && pnpm test && pnpm build` in a throwaway clone, confirm green (this mirrors the new job). Revert the throwaway clone.

- [ ] **Step 5: Run core tests + lint** — `pnpm exec vitest run scripts/materialize-app.test.ts && pnpm format && pnpm lint` green.

- [ ] **Step 6: Commit** — `ci(modules): materialize App from persistence and gate it; Landing gates the core`.

---

### Task 7: Actualize docs for Phase A

**Files:**
- Modify: `CHANGELOG.md` (add an `[Unreleased]` entry describing the mini-core + modules shift; **no apply plan** for template-internal restructuring unless it affects already-started projects — note that started App projects are unaffected because their code already has the stack).
- Modify: `README.md` (the template now boots as Landing; mention presets/modules in one paragraph and point at `docs/rules/modules.md`).
- Modify: `docs/rules/architecture.md` (a short note: `modules/` is outside the FSD-lite `src/` surface; import direction unchanged).
- Modify: `docs/decisions/0002-*.md` (append a line: Phase 1 implemented; link this plan).

- [ ] **Step 1:** Edit the four docs per above (concrete prose, no TBD).
- [ ] **Step 2:** `pnpm format && pnpm lint && pnpm skills:check && pnpm skills:validate` green (docs touching `docs/rules/**` triggers the skills gates per `verify`).
- [ ] **Step 3: Commit** — `docs(modules): actualize changelog, readme, architecture, ADR for the Landing/modules shift`.

---

## Phase B (separate plan, written next — nothing dropped)

Phase B depends on Phase A's artifacts and is the rest of spec v1:
1. `/liftoff` — preset selection after the Step 1 fit-check; a Step 4 "apply preset modules" sub-step; conditional 4c/4d/4f.
2. `verify` skill — skip db checks without `persistence`.
3. `deploy` playbook — Landing (no Postgres) vs App branch.
4. `docs/manifest.md` + its template — `## Preset` and `## Installed modules` fields.
5. `CLAUDE.md` — note invariant #2 applies only with `persistence` installed.
6. Skills-eval that liftoff routes the preset choice.
7. Open questions from the spec §10 (doc location final call; `add-module` skill for post-onboarding installs; `update`-skill interaction with partially-installed modules).

## Self-Review

**Spec coverage (Phase A slice of §9 items 1-3, 6):** §5 module format → Tasks 1,3; §5 apply-plan idiom → Task 3; §4 core reduction → Task 5; §5 deterministic apply for CI → Task 4; §8 round-trip + core guard → Tasks 5,6; §9.1 catalog → Task 1; §9.2 extract persistence → Tasks 3,5; §9.6 round-trip proven → Task 6. §9 items 4,5 (liftoff, preset-aware skills, manifest) → **Phase B** (flagged, not dropped).

**Placeholder scan:** the two `// sketch` blocks (Task 4 Step 1, Task 6) name exact fixtures/assertions to fill and are TDD scaffolds, not deferred work — each has a concrete "expect" list. No "TBD/handle edge cases" left.

**Type consistency:** `validateModules(root)`, `applyModule(name, root)`, `materialize-app` used consistently; script names match `package.json` entries (`modules:validate`, `module:apply`). Splice markers use one convention: `<!-- module:persistence:<slot> -->` (slots: `env-schema`, `landing-signin-link`) — same string in Task 3 fragments and Task 5 edits.
