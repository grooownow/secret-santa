# Preview Step and Single App Port — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the onboarding user actually see their running app, on a single rare port (3210) defined in one place, with e2e/lighthouse decoupled from the dev server.

**Architecture:** One TypeScript source of truth `config/ports.ts` (`export const APP_PORT = 3210`). TypeScript consumers (`scripts/dev.ts`, `playwright.config.ts`) import it; runtime-CJS consumers (`lighthouserc.js`) and the boundaries-isolated `src/lib/env.ts` hold a literal that a vitest guard test enforces against `APP_PORT`. A `scripts/dev.ts` wrapper finds the first free port ≥ 3210 (Next does NOT auto-increment an explicit port — verified) and launches `next dev`. `/liftoff` Step 5 gains a preview gate that leaves the dev server running; `playwright.config.ts` sets `reuseExistingServer: false` so the e2e suite always boots its own production build.

**Tech Stack:** Next 16, Playwright, Lighthouse CI (`@lhci/cli`), Vitest, `tsx` (already used for `scripts/seed.ts`), Node 22.

## Deviation from the design doc (mechanism, not intent)

The spec (`docs/superpowers/specs/2026-07-09-preview-step-and-port-design.md`)
named `config/ports.mjs` imported by every consumer including
`lighthouserc`. That mechanism does not work: the package is CJS
(`package.json` has no `"type"`), Lighthouse CI loads its config via
`require()`, and CJS `require()` cannot load an ESM `.mjs`. The **intent**
(one number, one source of truth) is preserved by using a `.ts` source
(`tsx` already runs `.ts` scripts here) plus a guard test for the two
consumers that must hold a literal. Verified before planning: `tsx` runs a
`.ts` importing a sibling `.ts`; `tsconfig` includes `**/*.ts`, so both
`config/ports.ts` and `scripts/dev.ts` are typechecked by `pnpm lint`.

## Global Constraints

- Single app port value is **3210**, defined once in `config/ports.ts` as `export const APP_PORT = 3210`. (spec §2)
- Every other appearance of the port is either an import of `APP_PORT` or a literal covered by the guard test — no un-guarded duplicate literal. (spec §2)
- `next dev` does NOT auto-increment an explicitly-set port — it fails `EADDRINUSE`. Only the wrapper finds a free port. (spec §3, verified on Next 16.2.10)
- The e2e/lighthouse test server is deterministic: it does NOT shift ports; occupied → fail loudly. `reuseExistingServer: false`. (spec §3, §5)
- Repo artifacts (code, comments, commits, docs) are English-only. (repo rule)
- No internal `<a href>`/`window.location`; no db/network in `src/middleware.ts` — untouched here but never violate. (CLAUDE.md invariants)
- Every feature ships a test proven able to fail. The guard test's fail-proof is a temporary `APP_PORT` edit showing red. (CLAUDE.md invariant 3)
- Conventional Commits. Run `pnpm format` before every commit (lefthook pre-commit runs `prettier --check`).
- Known limitation, do NOT try to fix here: the preview shows an app you cannot log into (no auth provider configured) — that is spec D's job. The preview checklist says `/dashboard` redirects, and that is expected. (spec §7)

---

### Task 1: Port source of truth, guard test, and all literal mirrors

This task lands the source, the guard test, AND every literal mirror the guard
covers, so its commit is green (`pnpm test` passes). The fail-proof is shown
mid-task: the guard is red before the mirrors are repointed, green after.
Playwright's decoupling is a separate task (Task 3) because it is about the
test-server contract, not the port literal.

**Files:**
- Create: `config/ports.ts`
- Create: `src/lib/ports.test.ts` (guard — must live under `src/` so the vitest `unit` project picks it up: `include: ["src/**/*.test.ts"]`)
- Modify: `src/lib/env.ts` (default `NEXT_PUBLIC_APP_URL`)
- Modify: `src/lib/env.test.ts` (existing 3000 assertion)
- Modify: `.env.example` (comment)
- Rename+rewrite: `lighthouserc.json` → `lighthouserc.js`

**Interfaces:**
- Produces: `export const APP_PORT: number` from `config/ports.ts` (value `3210`). Tasks 2-3 import this.

- [ ] **Step 1: Write the source constant**

Create `config/ports.ts`:

```ts
/**
 * The single source of truth for the local app port. Rare on purpose
 * (3210 = "3-2-1-0" liftoff countdown) so it does not collide with the
 * defaults of Next (3000), Angular (4200), or Vite (5173).
 *
 * TypeScript consumers (scripts/dev.ts, playwright.config.ts) import this.
 * Consumers that cannot import it at runtime — lighthouserc.js (CJS
 * require) and src/lib/env.ts (kept literal to avoid a config/ -> src/
 * import) — hold a literal that src/lib/ports.test.ts asserts against.
 */
export const APP_PORT = 3210;
```

- [ ] **Step 2: Write the guard test**

Create `src/lib/ports.test.ts`. It imports `APP_PORT` and asserts every literal mirror matches. It reads sibling files from the repo root (vitest's cwd):

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { APP_PORT } from "../../config/ports";
import { parseEnv } from "./env";

describe("APP_PORT is the single source of truth", () => {
  it("env.ts default NEXT_PUBLIC_APP_URL uses APP_PORT", () => {
    expect(parseEnv({}).NEXT_PUBLIC_APP_URL).toBe(
      `http://localhost:${APP_PORT}`,
    );
  });

  it(".env.example documents APP_PORT and not the old 3000", () => {
    const text = readFileSync(".env.example", "utf8");
    expect(text).toContain(`http://localhost:${APP_PORT}`);
    expect(text).not.toContain("http://localhost:3000");
  });

  it("lighthouserc.js targets APP_PORT and not the old 3000", () => {
    const text = readFileSync("lighthouserc.js", "utf8");
    expect(text).toContain(`localhost:${APP_PORT}`);
    expect(text).not.toContain("localhost:3000");
  });
});
```

- [ ] **Step 3: Run the guard test — verify it FAILS (the fail-proof)**

Run: `pnpm exec vitest run src/lib/ports.test.ts`
Expected: FAIL — `env.ts` still defaults to `:3000`, `.env.example` still says `3000`, and `lighthouserc.js` does not exist yet. This proves the guard can fail. The next steps make it green.

- [ ] **Step 4: Repoint env.ts default**

In `src/lib/env.ts`, change:
```ts
    NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),
```
to:
```ts
    // Default port mirrors config/ports.ts APP_PORT (kept literal to avoid a
    // config/ -> src/ import; src/lib/ports.test.ts guards the two staying
    // in sync).
    NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3210"),
```

- [ ] **Step 5: Repoint the env.test.ts assertion**

In `src/lib/env.test.ts`, update the existing case that expects `http://localhost:3000` (search for `3000`; it reads `defaults NEXT_PUBLIC_APP_URL to http://localhost:3000`):
```ts
  it("defaults NEXT_PUBLIC_APP_URL to http://localhost:3210", () => {
    const env = parseEnv({});
    expect(env.NEXT_PUBLIC_APP_URL).toBe("http://localhost:3210");
  });
```

- [ ] **Step 6: Repoint .env.example comment**

In `.env.example`, change:
```
# Public app URL, used in metadata (sitemap, robots, OG). Default: http://localhost:3000
```
to:
```
# Public app URL, used in metadata (sitemap, robots, OG). Default: http://localhost:3210
```

- [ ] **Step 7: Migrate lighthouserc.json → lighthouserc.js**

Delete `lighthouserc.json` and create `lighthouserc.js` (CJS, loaded by `@lhci/cli` via require). It cannot import the TS source at runtime, so it holds a literal guarded by this task's test:
```js
// Port is a literal here (CJS require can't load the TS source); it mirrors
// config/ports.ts APP_PORT and src/lib/ports.test.ts fails if they drift.
const APP_PORT = 3210;

module.exports = {
  ci: {
    collect: {
      startServerCommand: "pnpm start",
      url: [`http://localhost:${APP_PORT}/`, `http://localhost:${APP_PORT}/signin`],
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        "categories:performance": [
          "error",
          { minScore: 0.9, aggregationMethod: "median-run" },
        ],
        "categories:accessibility": [
          "error",
          { minScore: 0.9, aggregationMethod: "median-run" },
        ],
      },
    },
    upload: { target: "filesystem", outputDir: ".lighthouseci" },
  },
};
```

- [ ] **Step 8: Check CI references lighthouse config by name**

Run: `grep -rn "lighthouserc" .github/ package.json 2>/dev/null`
Expected: `@lhci/cli` auto-discovers `lighthouserc.js` (it checks `.js`/`.json`/`.yml`). If a reference names `lighthouserc.json` explicitly, update it to `lighthouserc.js`. If none, no change — note it in the report.

- [ ] **Step 9: Guard + env tests now pass**

Run: `pnpm exec vitest run src/lib/ports.test.ts src/lib/env.test.ts`
Expected: PASS — all three guard assertions and the env default assertion green.

- [ ] **Step 10: Commit (green)**

```bash
pnpm format
git add config/ports.ts src/lib/ports.test.ts src/lib/env.ts src/lib/env.test.ts .env.example lighthouserc.js
git rm lighthouserc.json
git commit -m "feat: single source of truth for the app port (APP_PORT=3210)"
```

---

### Task 2: Dev-server wrapper on a free port

**Files:**
- Create: `scripts/dev.ts`
- Modify: `package.json` (`dev` and `start` scripts)

**Interfaces:**
- Consumes: `APP_PORT` from `config/ports.ts`.
- Produces: `pnpm dev` runs `node`-via-`tsx` wrapper that prints the actual `- Local: http://localhost:<port>` line from `next dev`.

- [ ] **Step 1: Write the wrapper**

Create `scripts/dev.ts`. NOTE: the package is CJS (`package.json` has no
`"type": "module"`), so `tsx`/esbuild compiles this to CommonJS, which
**rejects top-level `await`**. Wrap the logic in an `async function main()`
called with `.then/.catch`, exactly like `scripts/seed.ts` does — do not use
a top-level `await`:

```ts
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { APP_PORT } from "../config/ports";

/**
 * `next dev --port N` does NOT auto-increment when N is taken — it fails
 * with EADDRINUSE (verified on Next 16.2.10; only the *default* port
 * auto-increments). So we find the first free port at or above APP_PORT
 * ourselves, then hand it to Next explicitly.
 */
function isFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const srv = createServer();
    srv.once("error", () => resolve(false));
    srv.once("listening", () => srv.close(() => resolve(true)));
    // Bind with NO host so we probe the dual-stack `::` address that
    // `next dev` itself binds. Probing `127.0.0.1` gives a false "free" when
    // the port is occupied on `::` (verified on Node 22/macOS), which would
    // hand Next a taken port and crash it with EADDRINUSE.
    srv.listen(port);
  });
}

async function firstFreePort(start: number, attempts = 10): Promise<number> {
  for (let port = start; port < start + attempts; port++) {
    if (await isFree(port)) return port;
  }
  throw new Error(
    `No free port in ${start}..${start + attempts - 1}. Free one and retry.`,
  );
}

async function main() {
  const port = await firstFreePort(APP_PORT);
  const child = spawn("next", ["dev", "--port", String(port)], {
    stdio: "inherit",
    shell: false,
  });
  child.on("exit", (code) => process.exit(code ?? 0));
}

main().catch((error) => {
  console.error("dev server failed to start:", error);
  process.exit(1);
});
```

- [ ] **Step 2: Point package.json at the wrapper**

In `package.json` set:
```json
"dev": "tsx scripts/dev.ts",
"start": "next start --port 3210",
```
(`start` is the production server for Playwright/Lighthouse — deterministic, no shift. It uses a literal `3210`; the guard test does not cover `package.json`, so Step 4 verifies it by grep.)

- [ ] **Step 3: Verify the wrapper picks a free port and reports it**

Run (occupy 3210, then start dev, capture output):
```bash
node -e "require('net').createServer().listen(3210,()=>console.log('occ'))" & DUMMY=$!
sleep 1
pnpm dev > /tmp/dev.log 2>&1 & DEV=$!
sleep 12
grep -E "Local:.*localhost:3211" /tmp/dev.log && echo "OK shifted to 3211"
kill $DEV $DUMMY 2>/dev/null; pkill -f "next dev" 2>/dev/null
```
Expected: prints `OK shifted to 3211` — wrapper skipped the occupied 3210.

- [ ] **Step 4: Verify start port and free-port path**

Run:
```bash
grep -E '"start": "next start --port 3210"' package.json && echo "start OK"
pnpm dev > /tmp/dev2.log 2>&1 & DEV=$!; sleep 12
grep -E "Local:.*localhost:3210" /tmp/dev2.log && echo "OK free 3210"
kill $DEV 2>/dev/null; pkill -f "next dev" 2>/dev/null
```
Expected: `start OK` and `OK free 3210` (nothing occupying 3210 → uses it).

- [ ] **Step 5: Commit**

```bash
pnpm format
git add scripts/dev.ts package.json
git commit -m "feat: dev wrapper picks first free port at or above APP_PORT"
```

---

### Task 3: Decouple the e2e server (playwright on APP_PORT, no reuse)

**Files:**
- Modify: `playwright.config.ts` (import `APP_PORT`, use it, `reuseExistingServer: false`, fix the reuse comment)

**Interfaces:**
- Consumes: `APP_PORT` from `config/ports.ts`.

- [ ] **Step 1: Add the import and a base-URL constant**

At the top of `playwright.config.ts`, below the existing `@playwright/test` import, add:
```ts
import { APP_PORT } from "./config/ports";

const BASE_URL = `http://localhost:${APP_PORT}`;
```

- [ ] **Step 2: Fix the doc comment**

In the file's leading block comment, replace the sentence:
```
 * (a full `next build`), so give it a generous timeout; CI always starts a
 * fresh server (`reuseExistingServer: !process.env.CI`) while local runs
 * reuse one already listening on port 3000.
```
with:
```
 * (a full `next build`), so give it a generous timeout. The suite always
 * boots its own server (`reuseExistingServer: false`) so it never silently
 * tests a running `pnpm dev` instead of the production build.
```

- [ ] **Step 3: Repoint baseURL, webServer url, and reuse flag**

- `use.baseURL: "http://localhost:3000"` → `use.baseURL: BASE_URL`
- `webServer.url: "http://localhost:3000"` → `webServer.url: BASE_URL`
- `webServer.reuseExistingServer: !process.env.CI` → `webServer.reuseExistingServer: false`

Leave `webServer.command` (`pnpm db:reset && pnpm build && pnpm start`) as is — `pnpm start` already carries `--port 3210` from Task 2.

- [ ] **Step 4: Typecheck picks up the new import**

Run: `pnpm exec tsc --noEmit`
Expected: no errors — `playwright.config.ts` resolves `./config/ports` (both are in the tsconfig program).

- [ ] **Step 5: Commit**

```bash
pnpm format
git add playwright.config.ts
git commit -m "feat: e2e server always boots its own build on APP_PORT (no dev reuse)"
```

---

### Task 4: e2e green on the new port with its own server

**Files:**
- None modified — this task proves Task 3 works end to end.

**Interfaces:**
- Consumes: everything from Tasks 1-3.

- [ ] **Step 1: Full e2e run**

Run: `pnpm test:e2e`
Expected: PASS — the suite boots its own `db:reset && build && start` on 3210 and all smoke specs pass. (First run may need `pnpm exec playwright install chromium`.)

- [ ] **Step 2: Prove the decoupling — dev running must NOT be reused**

Run:
```bash
pnpm dev > /tmp/devrun.log 2>&1 & DEV=$!
sleep 12
# now 3210 is taken by dev; the e2e server also wants 3210 and must fail loudly, not reuse dev
pnpm test:e2e > /tmp/e2e.log 2>&1; echo "e2e exit: $?"
kill $DEV 2>/dev/null; pkill -f "next dev" 2>/dev/null
grep -iE "EADDRINUSE|port.*in use|already" /tmp/e2e.log && echo "OK failed loudly (did not reuse dev)"
```
Expected: e2e exits non-zero with a port-in-use error — it did NOT silently test the dev server. This is the whole point of `reuseExistingServer: false`. Report the evidence.

- [ ] **Step 3: Build stays green**

Run: `pnpm build`
Expected: completes cleanly.

- [ ] **Step 4: No commit needed**

Verification only. If `git status` is clean, nothing to commit.

---

### Task 5: Preview gate in /liftoff Step 5 + skill/doc port copy

**Files:**
- Modify: `.claude/skills/liftoff/SKILL.md` (Step 5 + its Done-when)
- Modify: `.claude/skills/verify/SKILL.md` (the Port 3000 note)
- Modify: `docs/qa/project-profile.md` (port mentions)

**Interfaces:**
- Consumes: the port + dev-wrapper behavior from Tasks 2-4 (documentation only).

- [ ] **Step 1: Rewrite Step 5 item 1 (smoke → preview gate)**

In `.claude/skills/liftoff/SKILL.md`, Step 5's item 1 currently starts the dev server, smoke-checks as the agent, then **stops** it. Replace item 1 with a version that keeps the server up and adds a human preview gate. The new item 1:

```markdown
1. Start the app for the user to see: run `pnpm dev` in the background and
   read the actual URL from its output (`- Local: http://localhost:<port>`
   — the port is `3210` unless it was taken, in which case the wrapper picks
   the next free one). Smoke-check as the agent first: `/` returns 200 and
   the HTML contains the product name; `/signin` renders; `/dashboard`
   redirects to `/signin` when unauthenticated. Report each check with actual
   evidence (status code / snippet).

   Then hand the running app to the user (hard gate — do not proceed until
   they answer, same as the Step 2 PRD approval): print the URL and a short
   checklist — open `/` (the product name renders), `/signin` (the sign-in
   page), and note that `/dashboard` redirects to `/signin` because no auth
   provider is configured yet (expected — a working login is added later).
   Ask them to look and reply when ready. **Leave the dev server running**
   after onboarding; tell them the URL and that they can stop it with Ctrl-C
   in its terminal (or by killing the `next dev` process).
```

- [ ] **Step 2: Update Step 5 Done-when**

In the same Step 5, change the Done-when to include the preview gate. Current:
```markdown
**Done when:** smoke checks (including the db check) reported with evidence,
roadmap has no
`liftoff:fill` markers, and final gates `pnpm lint && pnpm test` are green.
```
New:
```markdown
**Done when:** smoke checks (including the db check) reported with evidence,
the user has confirmed they viewed the running app (preview gate), roadmap
has no `liftoff:fill` markers, and final gates `pnpm lint && pnpm test` are
green.
```

- [ ] **Step 3: Fix the verify skill's port note**

In `.claude/skills/verify/SKILL.md`, replace the `Port 3000` bullet:
```markdown
   - **Port 3000:** locally the suite reuses an existing server on port 3000
     (`reuseExistingServer` in `playwright.config.ts`). Kill any `next dev`
     on 3000 first, or e2e will test the dev server instead of the
     production build it's supposed to boot.
```
with:
```markdown
   - **Own server:** the suite always boots its own production build on the
     app port (`reuseExistingServer: false` in `playwright.config.ts`), so a
     running `pnpm dev` is never silently tested in its place. If that port
     is occupied, e2e fails loudly with a port-in-use error — stop the other
     server and retry.
```

- [ ] **Step 4: Fix qa profile port mentions**

In `docs/qa/project-profile.md`, update the three port references (lines ~19, ~55, ~81) from `3000` to `3210`. Exact replacements:
- `- Run the app locally: \`pnpm dev\` (dev server, port 3000, \`next dev\`).` → `port 3210` and note it may shift if taken: `- Run the app locally: \`pnpm dev\` (dev server, port 3210 — shifts to the next free port if taken).`
- `- Start dev server: \`pnpm dev\` (port 3000).` → `(port 3210).`
- `\`http://localhost:3000\`, not \`next dev\`; local runs reuse an already` → `\`http://localhost:3210\`, not \`next dev\`; the suite always boots its own` (and adjust the trailing clause so it no longer says "reuse an already[-listening server]" — match it to `reuseExistingServer: false`).

- [ ] **Step 5: Verify no stale 3000 remains in shipped copy**

Run:
```bash
grep -rn "localhost:3000\|port 3000\|:3000" .claude/skills docs/qa docs/rules .env.example src config playwright.config.ts lighthouserc.js 2>/dev/null | grep -v node_modules
```
Expected: no matches (every shipped 3000 reference is gone). Superpowers specs/plans under `docs/superpowers/` may still mention 3000 historically — they are excluded from the export, so ignore matches there (the grep above does not scan them).

- [ ] **Step 6: Commit**

```bash
pnpm format
git add .claude/skills/liftoff/SKILL.md .claude/skills/verify/SKILL.md docs/qa/project-profile.md
git commit -m "docs: preview gate in liftoff Step 5; port copy to 3210"
```

---

### Task 6: Export cleanliness

**Files:**
- None modified.

**Interfaces:**
- Consumes: all prior tasks.

- [ ] **Step 1: Run export assertions**

The working tree must be clean (the script refuses a dirty tree; a pre-existing untracked `docs/marketing/landing.pen` is fine to `git stash -u` first and pop after). Then:
```bash
scripts/export-template.sh
```
Expected: `✅ Export assertions passed.` — required files present, no internal jargon, excludes gone. `config/ports.ts`, `scripts/dev.ts`, `lighthouserc.js` ship in the export (not in the EXCLUDES list).

- [ ] **Step 2: Confirm the exported package.json has the new dev script**

```bash
OUT=$(mktemp -d)/t; scripts/export-template.sh --out "$OUT" >/dev/null
grep -E "tsx scripts/dev.ts|next start --port 3210" "$OUT/package.json"
test -f "$OUT/config/ports.ts" && echo "ports.ts shipped"
test -f "$OUT/lighthouserc.js" && test ! -f "$OUT/lighthouserc.json" && echo "lighthouse migrated in export"
```
Expected: both dev/start lines present, `ports.ts shipped`, `lighthouse migrated in export`.

- [ ] **Step 3: No commit needed** — verification only.

---

## Self-Review

**Spec coverage:**
- §2 single port, one place, guard against drift → Task 1 (source + guard + all literal mirrors). ✓
- §3 wrapper finds free port; Next doesn't auto-increment explicit port; test server doesn't shift → Task 2 (wrapper), Task 2 (`start --port` literal), Task 4 Step 2 (loud failure). ✓
- §4 preview gate, live server, honest checklist, handover with stop instructions → Task 5 Steps 1-2. ✓
- §5 `reuseExistingServer: false`, gates decoupled, verify note removed → Task 3, Task 5 Step 3. ✓
- §6 all listed files → Tasks 1-5 (config/ports.ts, scripts/dev.ts, package.json, playwright, lighthouserc.js, .env.example, env.ts+test, liftoff, verify, qa profile). ✓
- §8 verification (guard fails-then-passes within Task 1, e2e on new port, occupied-port manual, export) → Task 1 Steps 3+9, Task 4, Task 2 Step 3, Task 6. ✓

**Placeholder scan:** No TBD/TODO; every code/edit step shows exact content. ✓

**Type/name consistency:** `APP_PORT` spelled identically in `config/ports.ts`, `scripts/dev.ts`, `playwright.config.ts`, `src/lib/ports.test.ts`; the literal `3210` appears in `env.ts`, `.env.example`, `package.json` start, `lighthouserc.js`, all covered by the guard test (Task 1) or Task 2/4 greps. ✓

**Green-commit check:** every task commits green. Task 1's guard is red only transiently (Step 3, the fail-proof) and green by Step 9 before the Step 10 commit — the failing state is never committed. Task 2's wrapper and Task 3's playwright change keep the suite green.
