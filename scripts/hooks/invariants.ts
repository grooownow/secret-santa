/**
 * The hard invariants of CLAUDE.md, as code.
 *
 * Until now every invariant was prose: the agent was *asked* not to add a
 * network call to middleware, and a reviewer was asked to catch it if it did.
 * These functions are the same rules expressed as predicates over a proposed
 * edit, so a `PreToolUse` hook can refuse the write instead of regretting it.
 *
 * Two deliberate design choices:
 *
 * 1. **Only the added text is inspected.** An `Edit` carries `new_string`; a
 *    pre-existing violation elsewhere in the file is not this edit's fault and
 *    blocking on it would make the file uneditable.
 * 2. **`deny` is reserved for patterns with no legitimate form.** A heuristic
 *    that can be wrong (zod coverage) returns `ask`, which surfaces the
 *    concern and lets the human overrule it. A rule that cries wolf gets
 *    switched off, and then it enforces nothing.
 */

/** Mirrors the hook contract: `ask` prompts the user, `deny` blocks outright. */
export type Decision = "deny" | "ask";

export interface Violation {
  decision: Decision;
  /** The CLAUDE.md invariant number, for a message the agent can act on. */
  invariant: number;
  reason: string;
}

/** Conventional Commits, plus the `gridfin:` exception carved out in docs/rules/git.md. */
const CONVENTIONAL =
  /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([a-z0-9._/-]+\))?!?: .+/;
const GRIDFIN_COMMIT = /^gridfin: step \d+/;

/**
 * `<a href="/dashboard">` — an internal link that throws away client-side
 * routing. External schemes, in-page anchors, and Next's own `<Link>` (which
 * renders an `<a>` at runtime, not in source) are all fine.
 */
const INTERNAL_ANCHOR =
  /<a\s[^>]*href\s*=\s*(?:"\/(?!\/)|'\/(?!\/)|\{\s*[`"']\/)/;

/** Assignment or method call — reading `window.location.pathname` is legitimate. */
const WINDOW_LOCATION_NAV =
  /window\.location\s*(?:=|\.(?:href|pathname|search|hash)\s*=|\.(?:assign|replace)\s*\()/;

/** A DB/network reach in middleware: the per-request round trip we banned. */
const MIDDLEWARE_IMPURITY =
  /\b(?:fetch|axios)\s*\(|from\s+["'](?:@\/lib\/auth|@\/db|drizzle-orm|postgres|@electric-sql\/pglite)["']|\bdb\./;

/** Any zod use at all — `parse`, `safeParse`, or a schema built for one. */
const ZOD_PRESENT = /\bfrom\s+["']zod["']|\bz\.\w+|\.(?:safeParse|parse)\s*\(/;

/**
 * A raw color literal in UI source: hex, `rgb()`/`hsl()`/`oklch()` functions,
 * or a Tailwind arbitrary-value color class (`bg-[#0af]`, `text-[rgb(…)]`).
 * Colors belong in the token set (`src/app/globals.css`); components consume
 * tokens. Palette classes like `bg-zinc-900` are left to review — banning them
 * here would cry wolf on legitimate neutral utilities.
 */
const RAW_COLOR =
  /#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{8}|[0-9a-fA-F]{3,4})\b|\b(?:rgba?|hsla?|oklch)\s*\(/;
const ARBITRARY_COLOR_CLASS = /-\[(?:#|rgba?\(|hsla?\(|oklch\()/;

/**
 * Files that legitimately hardcode colors: Next's metadata images
 * (opengraph-image, icon, apple-icon) render standalone and cannot read the
 * CSS token set.
 */
function isTokenExempt(filePath: string): boolean {
  return /(?:^|\/)(?:opengraph-image|twitter-image|icon|apple-icon)\.tsx$/.test(
    filePath,
  );
}

/** An exported async function that takes at least one argument, i.e. accepts input. */
const EXPORTED_ASYNC_WITH_PARAMS =
  /export\s+(?:async\s+function|const)\s+\w+[^\n]*?\(\s*[^)\s]/;

/** Route handlers are the other half of invariant #4. */
const ROUTE_HANDLER =
  /export\s+(?:async\s+)?function\s+(?:GET|POST|PUT|PATCH|DELETE)\b/;

function isSource(filePath: string): boolean {
  return /(^|\/)src\//.test(filePath) && /\.(ts|tsx)$/.test(filePath);
}

function isMiddleware(filePath: string): boolean {
  return /(^|\/)src\/middleware\.ts$/.test(filePath);
}

/**
 * Test files legitimately contain the very strings we ban — a test that proves
 * `<a href="/x">` is rejected has to *write* `<a href="/x">`.
 */
function isTest(filePath: string): boolean {
  return (
    /\.(test|spec)\.(ts|tsx)$/.test(filePath) || /(^|\/)tests?\//.test(filePath)
  );
}

/**
 * Decide on a single proposed write. `added` is the text this edit introduces,
 * not the whole file.
 */
export function checkEdit(filePath: string, added: string): Violation | null {
  if (!added.trim()) return null;

  // Middleware is checked before the test escape hatch: there is no such thing
  // as a test-only exception to "middleware does no I/O", and the file itself
  // is never a test.
  if (isMiddleware(filePath) && MIDDLEWARE_IMPURITY.test(added)) {
    return {
      decision: "deny",
      invariant: 2,
      reason:
        "src/middleware.ts must stay a local JWT check — no network or db call. " +
        "The adapter-bound `@/lib/auth` and any fetch/db access add a per-request " +
        "round trip to every matched route. Use the edge-safe `authConfig`, and put " +
        "the real guard in `requireUser()` (src/features/auth/require-user.ts).",
    };
  }

  if (!isSource(filePath) || isTest(filePath)) return null;

  if (INTERNAL_ANCHOR.test(added)) {
    return {
      decision: "deny",
      invariant: 1,
      reason:
        'Internal navigation must use `<Link>` from `next/link`, not `<a href="/…">` — ' +
        "a raw anchor triggers a full document load and loses client-side routing. " +
        "External URLs, `mailto:`, `tel:`, and `#anchor` links are fine.",
    };
  }

  if (WINDOW_LOCATION_NAV.test(added)) {
    return {
      decision: "deny",
      invariant: 1,
      reason:
        "Navigating via `window.location` bypasses the router. Use `<Link>`, or " +
        "`useRouter()` from `next/navigation` when you need to navigate imperatively. " +
        "(Reading `window.location.pathname` is fine — assigning to it is not.)",
    };
  }

  if (
    /\.tsx$/.test(filePath) &&
    !isTokenExempt(filePath) &&
    (RAW_COLOR.test(added) || ARBITRARY_COLOR_CLASS.test(added))
  ) {
    return {
      decision: "ask",
      invariant: 6,
      reason:
        "This edit hardcodes a color (hex/rgb/hsl or an arbitrary-value Tailwind " +
        "class) in UI source. Invariant #6: UI colors come from the design tokens " +
        "in src/app/globals.css — use the token-bound classes (bg-background, " +
        "text-muted-foreground, …) so theming and dark mode keep working. If this " +
        "color genuinely cannot be a token (canvas drawing, third-party embed), " +
        "approve and carry on.",
    };
  }

  const isServerAction = /^\s*["']use server["']/m.test(added);
  const acceptsInput =
    EXPORTED_ASYNC_WITH_PARAMS.test(added) || ROUTE_HANDLER.test(added);
  if (
    (isServerAction || /(^|\/)src\/app\/.*\/route\.ts$/.test(filePath)) &&
    acceptsInput
  ) {
    if (!ZOD_PRESENT.test(added)) {
      return {
        decision: "ask",
        invariant: 4,
        reason:
          "This looks like a server action or route handler that takes input, and I " +
          "cannot see a zod parse in the edit. Invariant #4: every server action and " +
          "route validates its input with zod before use. If the schema lives elsewhere " +
          "in the file, or this handler genuinely takes no untrusted input, approve and " +
          "carry on.",
      };
    }
  }

  return null;
}

/**
 * Removes heredoc bodies from a command line.
 *
 * The hook is handed the whole Bash command, and `git commit -F - <<'EOF' … EOF`
 * carries the commit message as *data*, not as arguments. Without this, prose
 * inside the message gets parsed as shell: a commit whose body quotes a broken
 * command (`… git tag -m "1.0 — title"`) was denied because the hook read the
 * quoted example as a real invocation. A guard that cannot tell a command from a
 * sentence about a command will eventually refuse honest work.
 *
 * Consequence worth stating out loud: a `-F`/heredoc commit message is invisible
 * to this hook, so its subject is NOT checked. That is the right trade — the
 * alternative is parsing prose — and lint/CI still see the commit either way.
 */
function stripHeredocs(command: string): string {
  return command.replace(
    /<<-?\s*(['"]?)([A-Za-z_][A-Za-z0-9_]*)\1[\s\S]*?^\s*\2\s*$/gm,
    " ",
  );
}

/**
 * Pulls the `-m`/`--message` payload out of a `git commit` — and ONLY out of the
 * `git commit`.
 *
 * The naive version scanned the whole command line for the first `-m`, which
 * meant `git commit -F - && git tag -a v1 -m "1.0 — a title"` read the TAG's
 * message as the commit subject and denied the commit. That is the failure mode
 * this whole file is supposed to avoid: a guard that fires on innocent work gets
 * switched off, and then it guards nothing. So the line is split into segments
 * first, and only a segment that is itself a `git commit` is inspected.
 *
 * Splitting on `&&`/`||`/`;`/`|` is not a shell parser and does not need to be —
 * a `-m` payload containing one of those separators can only *shorten* what we
 * read, i.e. fail toward allowing the commit, which is the safe direction.
 */
export function commitMessage(command: string): string | null {
  for (const segment of stripHeredocs(command).split(/&&|\|\||;|\|/)) {
    if (!/\bgit\s+(?:-[^\s]+\s+)*commit\b/.test(segment)) continue;
    const match = /(?:-m|--message[= ])\s*("([^"]*)"|'([^']*)')/.exec(segment);
    const message = match?.[2] ?? match?.[3];
    if (message !== undefined) return message;
  }
  return null;
}

export function checkBash(command: string): Violation | null {
  const message = commitMessage(command);
  if (message === null) return null;

  const subject = message.split("\n")[0]?.trim() ?? "";
  if (!subject || CONVENTIONAL.test(subject) || GRIDFIN_COMMIT.test(subject))
    return null;

  return {
    decision: "deny",
    invariant: 5,
    reason:
      `Commit subject "${subject}" is not a Conventional Commit. Use ` +
      "`<type>(<scope>): <subject>` with type one of feat|fix|docs|style|refactor|" +
      "perf|test|build|ci|chore|revert. (docs/rules/git.md carves out exactly one " +
      "exception: `gridfin: step N` onboarding commits.)",
  };
}
