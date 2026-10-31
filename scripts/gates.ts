#!/usr/bin/env tsx
/**
 * `pnpm gates` — run the gate sequence and write down what actually happened.
 *
 * Two things this replaces, both of which used to live in a skill's prose:
 *
 *   1. **The table.** `verify` asked the agent to run four commands and then
 *      assemble a PASS/FAIL table with quoted evidence. The commands were
 *      always mechanical; only the bookkeeping was left to the party with an
 *      incentive to round "probably fine" up to PASS. Now the table is rendered
 *      from exit codes.
 *   2. **The memory.** When a session ends, what it ran is gone. Every run
 *      writes `.gridfin/runs/<id>.json`, so "were the tests actually run on
 *      that branch?" is a question with an answer next week.
 *
 * The ledger is deliberately gitignored. It is a record of what a machine did
 * locally, not a project artifact: committing it would put a churning file in
 * every feature diff and tell a reviewer nothing they cannot see in CI.
 *
 * Usage:
 *   pnpm gates                       run every applicable gate
 *   pnpm gates --only lint,test      rerun a subset after a fix
 *   pnpm gates --waive e2e="no browser on this box"
 *   pnpm gates --scope "src/a.ts src/b.ts"   override the changed-path set
 *   pnpm gates:show [id]             print a past run
 *   pnpm gates:note "<step>" --status pass --evidence "…"
 *
 * A waiver is not a hidden skip: it is recorded with its reason, printed as
 * WAIVED, and listed under "not covered by this run". The user is allowed to
 * skip a gate — nobody is allowed to skip one quietly.
 */
import { spawn } from "node:child_process";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

import {
  evidenceFrom,
  planGates,
  renderTable,
  runResult,
  uncoveredBy,
  type GateResult,
  type RunNote,
  type RunRecord,
} from "./lib/gates";

const ROOT = process.cwd();
const LEDGER_DIR = path.join(ROOT, ".gridfin", "runs");

interface Args {
  only?: string[];
  waivers: Record<string, string>;
  scope?: string[];
  full: boolean;
  show: boolean;
  showId?: string;
  note?: { step: string; status: "pass" | "skipped"; evidence: string };
}

function parseArgs(argv: readonly string[]): Args {
  const args: Args = { waivers: {}, full: false, show: false };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]!;
    const next = (): string => argv[++i] ?? "";

    if (arg === "--only") args.only = next().split(",").filter(Boolean);
    else if (arg === "--full") args.full = true;
    else if (arg === "--scope")
      args.scope = next().split(/\s+/).filter(Boolean);
    else if (arg === "--show") {
      args.show = true;
      const id = argv[i + 1];
      if (id && !id.startsWith("--")) args.showId = argv[++i];
    } else if (arg === "--waive") {
      // `--waive e2e="reason"` or `--waive e2e=reason`
      const raw = next();
      const eq = raw.indexOf("=");
      const name = eq === -1 ? raw : raw.slice(0, eq);
      const reason = eq === -1 ? "" : raw.slice(eq + 1).replace(/^"|"$/g, "");
      if (!reason) {
        fail(
          `--waive ${name} needs a reason: --waive ${name}="why this gate is being skipped"`,
        );
      }
      args.waivers[name] = reason;
    } else if (arg === "--note") {
      args.note = { step: next(), status: "pass", evidence: "" };
    } else if (arg === "--status") {
      const value = next();
      if (value !== "pass" && value !== "skipped") {
        fail(`--status must be pass or skipped, got '${value}'`);
      }
      if (args.note) args.note.status = value;
    } else if (arg === "--evidence") {
      if (args.note) args.note.evidence = next();
    }
  }

  return args;
}

function fail(message: string): never {
  console.error(`✗ ${message}`);
  process.exit(2);
}

function packageScripts(): Set<string> {
  const pkg = JSON.parse(
    readFileSync(path.join(ROOT, "package.json"), "utf8"),
  ) as { scripts?: Record<string, string> };
  return new Set(Object.keys(pkg.scripts ?? {}));
}

/**
 * The diff under review: the branch against `main`, plus whatever is still
 * uncommitted. Both halves matter — a skill edited but not yet committed is
 * exactly the state in which someone asks whether the gates are green.
 *
 * Fails soft: a repo with no `main`, or no commits at all, still runs gates. It
 * only loses the two conditional decisions, and it says so rather than
 * pretending the diff was empty.
 */
function changedPaths(): { paths: string[]; scope: string } {
  const out = new Set<string>();
  let scope = "uncommitted changes";

  try {
    const committed = git(["diff", "main...HEAD", "--name-only"]);
    if (committed) {
      committed.split("\n").forEach((line) => line && out.add(line));
      scope = "main...HEAD + uncommitted";
    }
  } catch {
    // No main, or a detached/empty history — fall through to the working tree.
  }

  try {
    for (const line of git(["status", "--porcelain"]).split("\n")) {
      const file = line.slice(3).trim();
      if (file) out.add(file);
    }
  } catch {
    scope = "unknown (not a git repo)";
  }

  return { paths: [...out], scope };
}

function git(args: string[]): string {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

function gitOrEmpty(args: string[]): string {
  try {
    return git(args);
  } catch {
    return "";
  }
}

/**
 * Run one command, streaming its output so a five minute build still looks
 * alive, while keeping a copy to quote from.
 */
function runCommand(
  command: string,
): Promise<{ code: number; output: string }> {
  return new Promise((resolve) => {
    const child = spawn(command, {
      cwd: ROOT,
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let output = "";
    const collect = (chunk: Buffer): void => {
      const text = chunk.toString();
      output += text;
      process.stdout.write(text);
    };

    child.stdout.on("data", collect);
    child.stderr.on("data", collect);
    child.on("close", (code) => resolve({ code: code ?? 1, output }));
  });
}

function ledgerPath(id: string): string {
  return path.join(LEDGER_DIR, `${id}.json`);
}

function writeRecord(record: RunRecord): string {
  mkdirSync(LEDGER_DIR, { recursive: true });
  const file = ledgerPath(record.id);
  writeFileSync(file, `${JSON.stringify(record, null, 2)}\n`);
  return file;
}

function latestRecordFile(): string | null {
  if (!existsSync(LEDGER_DIR)) return null;
  const files = readdirSync(LEDGER_DIR)
    .filter((file) => file.endsWith(".json"))
    .sort();
  const last = files[files.length - 1];
  return last ? path.join(LEDGER_DIR, last) : null;
}

function readRecord(file: string): RunRecord {
  return JSON.parse(readFileSync(file, "utf8")) as RunRecord;
}

function show(id?: string): void {
  const file = id ? ledgerPath(id) : latestRecordFile();
  if (!file || !existsSync(file)) {
    console.error(
      id
        ? `✗ no run '${id}' in .gridfin/runs/`
        : "✗ no runs recorded yet — run `pnpm gates` first",
    );
    process.exit(1);
  }

  const record = readRecord(file);
  console.log(`Run ${record.id} — ${record.result.toUpperCase()}`);
  console.log(
    `branch ${record.branch} @ ${record.head || "(no commit)"} · scope: ${record.scope}`,
  );
  console.log(`started ${record.startedAt} · finished ${record.finishedAt}\n`);
  console.log(renderTable(record));
  console.log(
    "\nThe runner cannot cover these — record them with `pnpm gates:note`:",
  );
  for (const item of uncoveredBy(record)) console.log(`- ${item}`);
}

/**
 * Record a step no command can prove: a spec approved, a test watched failing,
 * docs actualized. These stay judgment calls — the point is not that the
 * machine now verifies them, it is that their absence becomes visible instead
 * of being indistinguishable from silence.
 */
function note(
  step: string,
  status: "pass" | "skipped",
  evidence: string,
): void {
  const file = latestRecordFile();
  if (!file) {
    console.error("✗ no run to annotate — run `pnpm gates` first");
    process.exit(1);
  }
  if (!evidence.trim()) {
    console.error(
      "✗ --evidence is required: a note nobody can check is not a record",
    );
    process.exit(2);
  }

  const record = readRecord(file);
  const entry: RunNote = {
    at: new Date().toISOString(),
    step,
    status,
    evidence,
  };
  record.notes.push(entry);
  writeFileSync(file, `${JSON.stringify(record, null, 2)}\n`);
  console.log(`✓ recorded on ${record.id}: ${step} — ${status}`);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.show) return show(args.showId);
  if (args.note) {
    return note(args.note.step, args.note.status, args.note.evidence);
  }

  const detected = changedPaths();
  const paths = args.scope ?? detected.paths;
  const scope = args.scope
    ? `explicit: ${args.scope.join(" ")}`
    : detected.scope;

  const planned = planGates({
    scripts: packageScripts(),
    changedPaths: paths,
    waivers: args.waivers,
    only: args.only,
    full: args.full,
  });

  const startedAt = new Date().toISOString();
  const results: GateResult[] = [];
  let failed = false;

  for (const gate of planned) {
    if (gate.status) {
      results.push({ ...gate, status: gate.status });
      continue;
    }

    // Stop at the first failure: later gates would only bury the signal, and a
    // build run against known-broken code costs minutes to tell you nothing.
    if (failed) {
      results.push({ ...gate, status: "skipped" });
      continue;
    }

    console.log(`\n▶ ${gate.label} — ${gate.command}`);
    const startedMs = Date.now();
    const { code, output } = await runCommand(gate.command);
    const status = code === 0 ? "pass" : "fail";
    if (status === "fail") failed = true;

    results.push({
      ...gate,
      status,
      exitCode: code,
      durationMs: Date.now() - startedMs,
      evidence: evidenceFrom(output, status),
    });
  }

  const record: RunRecord = {
    id: new Date().toISOString().replace(/[:.]/g, "-"),
    startedAt,
    finishedAt: new Date().toISOString(),
    branch: gitOrEmpty(["rev-parse", "--abbrev-ref", "HEAD"]) || "(unknown)",
    head: gitOrEmpty(["rev-parse", "--short", "HEAD"]),
    scope,
    gates: results,
    notes: [],
    result: runResult(results),
  };

  const file = writeRecord(record);

  console.log(`\n${renderTable(record)}\n`);
  console.log(
    "The runner cannot cover these — record them with `pnpm gates:note`:",
  );
  for (const item of uncoveredBy(record)) console.log(`- ${item}`);
  console.log(`\nLedger: ${path.relative(ROOT, file)}`);

  process.exit(record.result === "fail" ? 1 : 0);
}

// Not top-level `await`: tsx compiles these scripts as CJS, where it is a
// transform error rather than a runtime one — the failure arrives before the
// first line runs.
main().catch((error) => {
  console.error("gates failed to run:", error);
  process.exit(1);
});
