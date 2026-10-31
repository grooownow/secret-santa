#!/usr/bin/env tsx
/**
 * SessionStart hook: tell the user, once a day at most, if a newer Gridfin
 * template has shipped.
 *
 * Whatever this prints on stdout is injected into the session as context, so
 * the agent can relay it. That is the whole point — the notice reaches a buyer
 * who would never think to read a CHANGELOG, at the one moment they are looking.
 *
 * Everything here fails open and silent. No network, a private template they
 * can't reach, a git that isn't installed, a throttle file it can't write — all
 * resolve to "print nothing and exit 0". A startup hook that errors, hangs, or
 * nags is a hook the user disables, and then it protects no one.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { decideUpdateNotice } from "./update-check";

/** Where the template's version tags live. Reading tags needs no checkout. */
const TEMPLATE_REMOTE = "https://github.com/grooownow/gridfin-template.git";

/** Once a day. A version check that runs every session is a network call the user didn't ask for. */
const THROTTLE_MS = 24 * 60 * 60 * 1000;

/**
 * The throttle stamp lives in the system temp dir, keyed by project path — NOT
 * under .git. A buyer who downloaded a zip instead of cloning has no .git, and
 * a stamp we couldn't write there would make the check hit the network every
 * single session. Temp is writable everywhere and losing the stamp only costs
 * one extra check, which is the safe direction to fail.
 */
function stampPath(root: string): string {
  const key = createHash("sha1").update(root).digest("hex").slice(0, 16);
  return path.join(tmpdir(), `gridfin-update-check-${key}`);
}

function throttledOut(root: string): boolean {
  const stamp = stampPath(root);
  try {
    if (
      existsSync(stamp) &&
      Date.now() - statSync(stamp).mtimeMs < THROTTLE_MS
    ) {
      return true;
    }
    writeFileSync(stamp, "");
  } catch {
    // Can't stat or write the stamp — don't crash, but don't turn that into an
    // every-session network call either.
    return true;
  }
  return false;
}

/**
 * The TEMPLATE's version — which is not the product's version.
 *
 * `.gridfin-version` exists precisely because those two are different things.
 * The buyer owns `package.json`'s `version`: it is their product, and the day
 * they ship 1.0.0 of it, a check that read that field would conclude they are
 * ahead of the template and go silent forever. This file is ours, they never
 * touch it, and `pnpm release` is what moves it.
 *
 * The package.json fallback is only for projects updated from 0.2.0, which
 * tracked the template version there before this file existed. It is load-bearing
 * exactly once, and harmless after.
 */
function installedVersion(root: string): string | null {
  try {
    const stamped = readFileSync(
      path.join(root, ".gridfin-version"),
      "utf8",
    ).trim();
    if (stamped) return stamped;
  } catch {
    // No stamp — fall through to the legacy location.
  }

  try {
    const pkg = JSON.parse(
      readFileSync(path.join(root, "package.json"), "utf8"),
    ) as {
      version?: string;
    };
    return pkg.version ?? null;
  } catch {
    return null;
  }
}

function remoteTags(): string[] {
  try {
    const out = execFileSync("git", ["ls-remote", "--tags", TEMPLATE_REMOTE], {
      encoding: "utf8",
      timeout: 5000,
      stdio: ["ignore", "pipe", "ignore"],
    });
    return out.split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

function main(): void {
  try {
    const root = process.cwd();
    if (throttledOut(root)) return;

    const installed = installedVersion(root);
    if (!installed) return;

    const { message } = decideUpdateNotice(installed, remoteTags());
    if (message) process.stdout.write(message + "\n");
  } catch {
    // Belt and braces: nothing this hook does is worth interrupting a session.
  }
}

main();
