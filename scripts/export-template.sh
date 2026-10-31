#!/usr/bin/env bash
# Dev-repo-only tool: exports the buyer-facing template tree from HEAD.
# Internal content is excluded HERE, in code — the single source of truth
# for what buyers never see. This script excludes itself from the export.
#
# Usage:
#   scripts/export-template.sh [--out DIR] [--verify] [--push GIT_REMOTE]
#     --out DIR     export destination (default: a fresh temp dir)
#     --verify      run the buyer's first-run inside the export:
#                   ./scripts/bootstrap --ci && pnpm build
#     --push REMOTE force-push the export as the template repo's main
set -euo pipefail

# ---- the exclusion list (keep in one place) --------------------------------
EXCLUDES=(
  "docs/superpowers"
  "landing"
  "marketing"
  "scripts/export-template.sh"
  "scripts/release"
  # Asserts OUR changelog documents OUR released version. In a buyer's tree it
  # would fail the moment they version their own product, demanding a changelog
  # entry for a release that isn't ours to write. Their update flow needs the
  # hook and the /update skill, not our release preflight.
  "scripts/release-preconditions.test.ts"
  # OUR round-trip proof that a Landing core + the persistence/observability
  # modules reconstitutes App — it exists for this repo's CI, and nothing but
  # its own test calls it (the materialized-app job runs `pnpm module:apply`
  # directly). In a buyer's tree it is dead weight that copies their whole
  # repo into a temp dir on every `pnpm test`, and it fails outright in a tree
  # whose git has no commits yet. Buyers install a module with the
  # `add-module` skill, not with our proof harness.
  "scripts/materialize-app.ts"
  "scripts/materialize-app.test.ts"
)
# ----------------------------------------------------------------------------

OUT=""
VERIFY=false
PUSH_REMOTE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --out) OUT="$2"; shift 2 ;;
    --verify) VERIFY=true; shift ;;
    --push) PUSH_REMOTE="$2"; shift 2 ;;
    *) echo "Unknown argument: $1" >&2; exit 1 ;;
  esac
done

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "❌ Working tree is dirty — export runs from HEAD; commit or stash first." >&2
  exit 1
fi

[[ -z "$OUT" ]] && OUT="$(mktemp -d)/gridfin-template"
mkdir -p "$OUT"

echo "Exporting HEAD ($(git rev-parse --short HEAD)) → $OUT"
git archive HEAD | tar -x -C "$OUT"

for path in "${EXCLUDES[@]}"; do
  rm -rf "${OUT:?}/$path"
done

# The `release` script is dev-only and excluded above, but its package.json
# entry would survive and point a buyer at a file they don't have. Strip it, so
# `pnpm release` simply does not exist in their tree rather than erroring.
# Same for the marketing-landing scripts: marketing/ is excluded above, so
# i18n:check and landing:build would point a buyer at files they don't have.
node -e "const fs=require('fs');const p='$OUT/package.json';const j=JSON.parse(fs.readFileSync(p));delete j.scripts.release;delete j.scripts['i18n:check'];delete j.scripts['landing:build'];fs.writeFileSync(p,JSON.stringify(j,null,2)+'\n')"

# ---- built-in assertions: the export must be clean and complete ------------
fail() { echo "❌ EXPORT ASSERTION FAILED: $1" >&2; exit 1; }

for path in "${EXCLUDES[@]}"; do
  [[ -e "$OUT/$path" ]] && fail "excluded path still present: $path"
done

grep -q '"release"' "$OUT/package.json" && fail "dev-only 'release' script leaked into template package.json"

for required in LICENSE.md CHANGELOG.md README.md CLAUDE.md AGENTS.md \
  .claude/skills/gridfin/SKILL.md .claude/skills/feature/SKILL.md \
  docs/rules/architecture.md docs/playbooks/deploy.md docs/manifest.md \
  scripts/bootstrap package.json; do
  [[ -e "$OUT/$required" ]] || fail "required file missing: $required"
done

if grep -rn "Plan [0-9]\|superpowers\|kro-glo" "$OUT" \
  --include="*.md" --include="*.ts" --include="*.tsx" --include="*.yml" \
  --include="*.mjs" --include="*.json" -l 2>/dev/null | grep -q .; then
  fail "internal jargon leaked into the export (see grep above)"
fi
echo "✅ Export assertions passed."
# ----------------------------------------------------------------------------

if $VERIFY; then
  echo "Running buyer first-run verification (bootstrap --ci && build)…"
  # A real buyer clones the template repo, so their tree IS a git repo
  # (lefthook's prepare hook needs one). Mimic that state before verifying.
  (
    cd "$OUT"
    if [[ ! -d .git ]]; then git init -q -b main; fi
    ./scripts/bootstrap --ci
    pnpm build
  )
  echo "✅ Buyer first-run verified."
fi

if [[ -n "$PUSH_REMOTE" ]]; then
  echo "Pushing export to $PUSH_REMOTE (force, as main)…"
  (
    cd "$OUT"
    git init -q -b main
    git add -A
    git commit -q -m "Gridfin template $(date +%Y-%m-%d) — see CHANGELOG.md"
    git remote add origin "$PUSH_REMOTE"
    git push -f origin main
  )
  echo "✅ Pushed."
fi

echo "Done: $OUT"
