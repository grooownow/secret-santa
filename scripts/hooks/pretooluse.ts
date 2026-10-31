#!/usr/bin/env tsx
/**
 * PreToolUse hook: refuses edits that violate a hard invariant of CLAUDE.md.
 *
 * Contract (https://code.claude.com/docs/en/hooks.md): the hook reads a JSON
 * event on stdin and may print `hookSpecificOutput.permissionDecision` of
 * `deny` / `ask` / `allow` on stdout. Exit code 2 blocks the call outright;
 * any other non-zero exit is a *non-blocking* error and the tool proceeds.
 *
 * THIS HOOK ALWAYS EXITS 0. A guard that can brick a session is a guard that
 * gets uninstalled, so every failure path here — unparseable stdin, an
 * unexpected tool shape, a bug in a predicate — falls through to "allow" and
 * says nothing. The invariants are enforced a second time by lint, tests, and
 * the `review` skill; the hook is the fast path, not the last line of defence.
 */
import { checkBash, checkEdit, type Violation } from "./invariants";

interface HookEvent {
  tool_name?: string;
  tool_input?: Record<string, unknown>;
}

function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", () => resolve(""));
  });
}

/**
 * The text an edit *introduces*. `Write` carries the whole file; `Edit` carries
 * the replacement only — which is what we want, since a pre-existing violation
 * further down the file is not this edit's doing.
 */
export function addedText(input: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const key of ["content", "file_text", "new_string"]) {
    const value = input[key];
    if (typeof value === "string") parts.push(value);
  }
  const edits = input.edits;
  if (Array.isArray(edits)) {
    for (const edit of edits) {
      const value = (edit as Record<string, unknown> | null)?.new_string;
      if (typeof value === "string") parts.push(value);
    }
  }
  return parts.join("\n");
}

export function decide(event: HookEvent): Violation | null {
  const tool = event.tool_name;
  const input = event.tool_input ?? {};

  if (tool === "Bash") {
    const command = input.command;
    return typeof command === "string" ? checkBash(command) : null;
  }

  if (tool === "Edit" || tool === "Write" || tool === "NotebookEdit") {
    const filePath = input.file_path;
    if (typeof filePath !== "string") return null;
    return checkEdit(filePath, addedText(input));
  }

  return null;
}

function emit(violation: Violation): void {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: violation.decision,
        permissionDecisionReason: `[CLAUDE.md invariant #${violation.invariant}] ${violation.reason}`,
      },
    }),
  );
}

async function main(): Promise<void> {
  try {
    const raw = await readStdin();
    if (!raw.trim()) return;
    const violation = decide(JSON.parse(raw) as HookEvent);
    if (violation) emit(violation);
  } catch {
    // Fail open, silently. See the file header.
  }
}

void main().then(() => process.exit(0));
