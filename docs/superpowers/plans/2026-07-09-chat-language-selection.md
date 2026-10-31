# Chat-Language Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user pick their chat language at the first onboarding step and persist that choice project-wide so every later session — skill or not — speaks it.

**Architecture:** A new `## Chat language` field in `docs/manifest.md` is the single source of truth (ships empty with a `liftoff:fill` marker). A one-line directive in the always-loaded `CLAUDE.md`/`AGENTS.md` tells every session to read that field. `/liftoff` Step 0 asks the question (English-only prompt, native-script options), writes the answer, and commits. All skill/rule "user's language" phrasings are re-pointed at this source of truth.

**Tech Stack:** Markdown only — skills, docs, and the manifest. No runtime code. Verification is `scripts/export-template.sh` assertions plus grep/read checks.

## Global Constraints

- Repo artifacts (code, comments, commits, docs) stay **English-only**; only chat language varies. (spec §1)
- `CLAUDE.md` and `AGENTS.md` MUST stay byte-identical in shared sections — the banner `<!-- keep CLAUDE.md and AGENTS.md in sync — edit both -->` is enforced by review. (both files, line 1)
- The exported template ships the manifest field **unset**, with its `<!-- liftoff:fill -->` marker intact. (spec §2)
- New copy MUST NOT contain the strings `Plan <N>`, `superpowers`, or `kro-glo` — `scripts/export-template.sh` greps for and rejects them. (script lines 67-71)
- Manifest markers are removed **on the same line** when a field is filled, never by deleting the heading. (`docs/manifest.md` intro)
- Commit messages follow Conventional Commits, except `/liftoff` runtime commits which keep the `liftoff: step N` prefix. (`docs/rules/git.md`)

---

### Task 1: Source of truth — manifest field + always-loaded directive

**Files:**
- Modify: `docs/manifest.md` (insert a section between `## Current phase` and `## Key URLs`)
- Modify: `CLAUDE.md` (insert a section after `## Hard invariants`)
- Modify: `AGENTS.md` (identical insert after `## Hard invariants`)

**Interfaces:**
- Produces: the manifest section heading `## Chat language` and its `<!-- liftoff:fill -->` marker — Task 2 fills this field; the exact heading text is what Step 0's "already set?" check greps for.
- Produces: the CLAUDE.md/AGENTS.md directive wording that Task 3's skill/rule lines cross-reference.

- [ ] **Step 1: Add the manifest field**

In `docs/manifest.md`, insert this block immediately before the `## Key URLs` heading (after the `<!-- liftoff:fill -->` marker that closes `## Current phase`):

```markdown
## Chat language

The language the agent speaks with you in chat (artifacts stay English).
To change it later, edit the value below (or just ask the agent to switch).

<!-- liftoff:fill -->

```

- [ ] **Step 2: Add the directive to CLAUDE.md**

In `CLAUDE.md`, insert this section immediately after the `## Hard invariants (never violate)` list (before `## Rules — read the one matching your task`):

```markdown
## Chat language

Chat with the user in the language recorded in `docs/manifest.md` → _Chat
language_. If that field is still unset, fall back to the language of the
user's messages.

```

- [ ] **Step 3: Mirror the directive into AGENTS.md**

Insert the **identical** block in `AGENTS.md` at the same position (after `## Hard invariants (never violate)`, before `## Rules — read the one matching your task`).

- [ ] **Step 4: Verify the two files stayed in sync**

Run:
```bash
diff <(sed -n '/## Chat language/,/## Rules/p' CLAUDE.md) \
     <(sed -n '/## Chat language/,/## Rules/p' AGENTS.md)
```
Expected: no output (blocks identical).

- [ ] **Step 5: Verify no banned jargon leaked**

Run:
```bash
grep -nE "Plan [0-9]|superpowers|kro-glo" docs/manifest.md CLAUDE.md AGENTS.md
```
Expected: no matches (exit 1).

- [ ] **Step 6: Format and commit**

```bash
pnpm format
git add docs/manifest.md CLAUDE.md AGENTS.md
git commit -m "feat: chat-language source of truth (manifest field + entry-map directive)"
```

---

### Task 2: /liftoff Step 0 — ask, record, commit

**Files:**
- Modify: `.claude/skills/liftoff/SKILL.md` — the Ground-rules `Language` line (line ~17) and the whole `## Step 0 — Environment` block

**Interfaces:**
- Consumes: the `## Chat language` manifest heading + marker from Task 1 (the "already set?" check and the write target).

- [ ] **Step 1: Re-point the Ground-rules Language line**

Replace the current bullet:
```markdown
- **Language:** chat with the user in their language; every artifact (docs,
  code, commit messages) is English.
```
with:
```markdown
- **Language:** chat in the project's chat language — `docs/manifest.md` →
  _Chat language_ once Step 0 records it; until then, the language of the
  user's messages. Every artifact (docs, code, commit messages) is English.
```

- [ ] **Step 2: Prepend language selection to Step 0**

Replace the current Step 0 body (the two numbered items) so the block reads:

```markdown
## Step 0 — Environment

1. **Chat language (ask first, before anything else).** Check
   `docs/manifest.md` → `## Chat language`: if the field is already filled
   (no `liftoff:fill` marker), use that language and skip this question.
   Otherwise ask, in one message, **in English only** (options keep their
   native script):

   > Which language should I chat with you in?
   > 1. English 2. Русский 3. Español 4. Deutsch 5. Français 6. 中文
   > … or name any other language.

   Write the chosen language's name (e.g. `Russian`, `English`) into the
   `## Chat language` field, removing the `<!-- liftoff:fill -->` marker on
   that line. From here on, chat in the chosen language.
2. If `.env` or `node_modules/` is missing, run `./scripts/bootstrap` (it
   installs deps, creates `.env` from `.env.example`, migrates and seeds the
   local PGlite database).
3. Verify gates once: `pnpm lint && pnpm test`. A fresh template must be green
   here; a failure is an environment problem (Node >= 22? clean install?) —
   fix it before anything else. (`pnpm test:e2e` is exercised later by the
   `verify` flow; don't block onboarding on browser installs.)

**Done when:** both commands exit 0 and the `## Chat language` field is filled.
Step 0 now always changes a tracked file (the manifest), so it always commits:
`liftoff: step 0 — environment verified`.
```

- [ ] **Step 3: Verify the marker count logic is consistent**

Confirm the manifest still shows exactly one `liftoff:fill` marker under `## Chat language` in the template (unfilled), matching Task 1:
```bash
grep -A4 "## Chat language" docs/manifest.md | grep -c "liftoff:fill"
```
Expected: `1`.

- [ ] **Step 4: Verify no banned jargon**

```bash
grep -nE "Plan [0-9]|superpowers|kro-glo" .claude/skills/liftoff/SKILL.md
```
Expected: no matches (exit 1).

- [ ] **Step 5: Format and commit**

```bash
pnpm format
git add .claude/skills/liftoff/SKILL.md
git commit -m "feat: liftoff Step 0 asks and records chat language"
```

---

### Task 3: Align the other skills and the docs rule

**Files:**
- Modify: `.claude/skills/feature/SKILL.md:14-15`
- Modify: `.claude/skills/review/SKILL.md:21`
- Modify: `.claude/skills/verify/SKILL.md:23`
- Modify: `.claude/skills/deploy/SKILL.md:28-29`
- Modify: `docs/rules/docs.md` § Language

**Interfaces:**
- Consumes: the CLAUDE.md/AGENTS.md directive wording and the manifest field name from Task 1 (all references point at `docs/manifest.md` → _Chat language_).

- [ ] **Step 1: feature skill**

Replace:
```markdown
- **Language:** chat in the user's language; every artifact (code, docs,
  commits) is English.
```
with:
```markdown
- **Language:** chat in the project's chat language (`docs/manifest.md` →
  _Chat language_; see `CLAUDE.md`); every artifact (code, docs, commits) is
  English.
```

- [ ] **Step 2: review skill**

Replace:
```markdown
- **Language:** chat in the user's language; any written record is English.
```
with:
```markdown
- **Language:** chat in the project's chat language (`docs/manifest.md` →
  _Chat language_; see `CLAUDE.md`); any written record is English.
```

- [ ] **Step 3: verify skill**

Replace:
```markdown
- **Language:** report in the user's language; quoted evidence stays verbatim.
```
with:
```markdown
- **Language:** report in the project's chat language (`docs/manifest.md` →
  _Chat language_; see `CLAUDE.md`); quoted evidence stays verbatim.
```

- [ ] **Step 4: deploy skill**

Replace:
```markdown
- **Language:** chat in the user's language; anything written to the repo
  (commit messages, docs) is English.
```
with:
```markdown
- **Language:** chat in the project's chat language (`docs/manifest.md` →
  _Chat language_; see `CLAUDE.md`); anything written to the repo (commit
  messages, docs) is English.
```

- [ ] **Step 5: docs/rules/docs.md § Language**

Replace:
```markdown
Everything checked into this repo — code, comments, commits, docs — is
English. Chat with the user in the user's own language; only the artifacts
that live in the repo are English-only.
```
with:
```markdown
Everything checked into this repo — code, comments, commits, docs — is
English. Chat with the user in the project's chat language (`docs/manifest.md`
→ _Chat language_; falls back to the language of the user's messages while
unset); only the artifacts that live in the repo are English-only.
```

- [ ] **Step 6: Verify all five references landed and none are banned jargon**

```bash
grep -rn "Chat language\|chat language" .claude/skills/feature/SKILL.md \
  .claude/skills/review/SKILL.md .claude/skills/verify/SKILL.md \
  .claude/skills/deploy/SKILL.md docs/rules/docs.md
grep -rnE "Plan [0-9]|superpowers|kro-glo" .claude/skills/feature/SKILL.md \
  .claude/skills/review/SKILL.md .claude/skills/verify/SKILL.md \
  .claude/skills/deploy/SKILL.md docs/rules/docs.md
```
Expected: first command shows one reference per file (5 lines); second shows no matches.

- [ ] **Step 7: Format and commit**

```bash
pnpm format
git add .claude/skills/feature/SKILL.md .claude/skills/review/SKILL.md \
  .claude/skills/verify/SKILL.md .claude/skills/deploy/SKILL.md docs/rules/docs.md
git commit -m "docs: point skill/rule language guidance at manifest chat-language field"
```

---

### Task 4: Full export verification

**Files:**
- None modified — this task proves the template still exports clean.

**Interfaces:**
- Consumes: all changes from Tasks 1-3.

- [ ] **Step 1: Run the export cleanliness assertions**

The working tree must be committed first (the script refuses a dirty tree). Then:
```bash
scripts/export-template.sh
```
Expected: `✅ Export assertions passed.` and `Done: <tmp path>`. In particular the internal-jargon grep must not fire on any new copy.

- [ ] **Step 2: (Optional, heavier) buyer first-run verification**

Only if a clean pnpm/network environment is available:
```bash
scripts/export-template.sh --verify
```
Expected: `✅ Export assertions passed.` then `✅ Buyer first-run verified.`
If pnpm/network is unavailable, skip and note it — Step 1 covers the
copy/marker correctness this plan is responsible for.

- [ ] **Step 3: Spot-check the exported manifest ships unset**

```bash
OUT=$(mktemp -d)/t; scripts/export-template.sh --out "$OUT" >/dev/null
grep -A4 "## Chat language" "$OUT/docs/manifest.md"
```
Expected: the `## Chat language` section is present and its `<!-- liftoff:fill -->` marker is intact (field unset).

- [ ] **Step 4: No commit needed**

This task modifies nothing; if `git status` is clean, there is nothing to commit.

---

## Self-Review

**Spec coverage:**
- §2 manifest field → Task 1 Step 1. ✓
- §3 CLAUDE.md/AGENTS.md directive → Task 1 Steps 2-4. ✓
- §4 Step 0 ask/record/commit + done-when + ground-rules line → Task 2. ✓
- §5 align feature/review/verify/deploy/liftoff + docs.md → Task 2 Step 1 (liftoff) + Task 3. ✓
- §6 change-later hint → Task 1 Step 1 (manifest copy). ✓
- §8 export --verify check → Task 4. ✓

**Placeholder scan:** No TBD/TODO; every edit shows exact before/after copy. ✓

**Type/name consistency:** The heading `## Chat language` is spelled identically in the manifest, the CLAUDE.md/AGENTS.md directive, Step 0's grep, and all Task 3 references. ✓
