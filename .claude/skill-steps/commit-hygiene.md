- **Format before every commit.** Run `pnpm format` first — lefthook's
  pre-commit `prettier --check` rejects an unformatted file, and a commit
  rejected in the middle of a flow is how a step ends up half-applied.
- **A commit is a resume point, so only green steps get one.** Never commit
  over a red gate: a session that drops after a green commit resumes from a
  known state, and one that committed a red step leaves the next session
  trusting work that does not pass.
