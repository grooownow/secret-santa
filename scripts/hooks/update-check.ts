/**
 * The version-comparison brain of the update check, as pure functions.
 *
 * The problem this solves is discoverability, not networking: a buyer knows two
 * commands and how to talk to the agent. They have no reason to open CHANGELOG,
 * so a new release is invisible to them. The fix is to surface it where they
 * already are — one line at the start of a session — and the only judgement
 * that needs testing is "is the remote newer than what I have, and should I
 * even ask right now?". That is here; the IO (git, clock, files) lives in
 * session-update-check.ts and is injected, so this stays deterministic.
 */

export interface SemVer {
  major: number;
  minor: number;
  patch: number;
}

/** Parses `1.2.3` or `v1.2.3`. Anything else is null — a tag we don't understand. */
export function parseSemver(raw: string): SemVer | null {
  const match = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(raw.trim());
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

/** Negative if a < b, 0 if equal, positive if a > b. */
export function compareSemver(a: SemVer, b: SemVer): number {
  return a.major - b.major || a.minor - b.minor || a.patch - b.patch;
}

/**
 * The newest version among a set of git tags. `git ls-remote --tags` returns a
 * pile of `refs/tags/v1.2.3` lines (and `^{}` dereference lines we ignore);
 * this picks the highest one it can parse and discards the rest. A tag it can't
 * read is not a reason to fail — it's a reason to skip that tag.
 */
export function latestVersion(tagLines: string[]): SemVer | null {
  let best: SemVer | null = null;
  for (const line of tagLines) {
    const ref = line.split(/\s+/).pop() ?? "";
    if (ref.endsWith("^{}")) continue;
    const tag = ref.replace(/^refs\/tags\//, "");
    const version = parseSemver(tag);
    if (version && (best === null || compareSemver(version, best) > 0))
      best = version;
  }
  return best;
}

export interface UpdateDecision {
  /** The one-line notice to print, or null to stay silent. */
  message: string | null;
}

/**
 * Decide what, if anything, to tell the user. Silent unless the remote is
 * strictly newer than what's installed. Every "I don't know" — unparseable
 * version, no tags, no network — resolves to silence, never noise: a broken
 * update check that nags is worse than one that says nothing.
 */
export function decideUpdateNotice(
  installedRaw: string,
  tagLines: string[],
): UpdateDecision {
  const installed = parseSemver(installedRaw);
  const latest = latestVersion(tagLines);
  if (!installed || !latest) return { message: null };
  if (compareSemver(latest, installed) <= 0) return { message: null };

  const from = `${installed.major}.${installed.minor}.${installed.patch}`;
  const to = `${latest.major}.${latest.minor}.${latest.patch}`;
  return {
    message: `Gridfin ${to} is available (you're on ${from}). Run /update to see what changed and apply it.`,
  };
}
