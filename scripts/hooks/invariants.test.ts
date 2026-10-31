import { describe, expect, it } from "vitest";

import { checkBash, checkEdit, commitMessage } from "./invariants";
import { addedText, decide } from "./pretooluse";

const PAGE = "src/app/dashboard/page.tsx";

describe("invariant #1 — navigation", () => {
  it("denies an internal <a href>", () => {
    const violation = checkEdit(PAGE, '<a href="/dashboard">Go</a>');
    expect(violation?.decision).toBe("deny");
    expect(violation?.invariant).toBe(1);
  });

  it("denies an internal <a href> written with a template expression", () => {
    expect(checkEdit(PAGE, "<a href={`/users/${id}`}>x</a>")?.invariant).toBe(
      1,
    );
  });

  it("allows external, mailto, tel and anchor links", () => {
    expect(checkEdit(PAGE, '<a href="https://example.com">x</a>')).toBeNull();
    expect(checkEdit(PAGE, '<a href="//cdn.example.com/x">x</a>')).toBeNull();
    expect(checkEdit(PAGE, '<a href="mailto:a@b.c">x</a>')).toBeNull();
    expect(checkEdit(PAGE, '<a href="#section">x</a>')).toBeNull();
  });

  it("allows <Link>, which is the whole point of the rule", () => {
    expect(checkEdit(PAGE, '<Link href="/dashboard">Go</Link>')).toBeNull();
  });

  it("denies assigning to window.location but allows reading it", () => {
    expect(
      checkEdit(PAGE, 'window.location.href = "/dashboard";')?.invariant,
    ).toBe(1);
    expect(checkEdit(PAGE, 'window.location.assign("/x");')?.invariant).toBe(1);
    expect(checkEdit(PAGE, "const p = window.location.pathname;")).toBeNull();
  });
});

describe("invariant #2 — middleware stays local", () => {
  const MW = "src/middleware.ts";

  it("denies a fetch in middleware", () => {
    const violation = checkEdit(
      MW,
      'const r = await fetch("https://api.example.com");',
    );
    expect(violation?.decision).toBe("deny");
    expect(violation?.invariant).toBe(2);
  });

  it("denies importing the adapter-bound auth module", () => {
    expect(checkEdit(MW, 'import { auth } from "@/lib/auth";')?.invariant).toBe(
      2,
    );
  });

  it("denies a db call in middleware", () => {
    expect(
      checkEdit(MW, "const user = await db.query.users.findFirst();")
        ?.invariant,
    ).toBe(2);
  });

  it("allows the edge-safe config the file is supposed to use", () => {
    expect(
      checkEdit(MW, 'import { authConfig } from "@/lib/auth.config";'),
    ).toBeNull();
  });

  it("does not police fetch in ordinary source files", () => {
    expect(
      checkEdit("src/features/profile/api.ts", 'await fetch("/api/x");'),
    ).toBeNull();
  });
});

describe("invariant #6 — UI colors come from design tokens", () => {
  it("asks on a hex color in a component", () => {
    const violation = checkEdit(
      PAGE,
      '<div style={{ background: "#1a2b3c" }}>x</div>',
    );
    expect(violation?.decision).toBe("ask");
    expect(violation?.invariant).toBe(6);
  });

  it("asks on an arbitrary-value Tailwind color class", () => {
    expect(
      checkEdit(PAGE, '<p className="bg-[#0af] p-4">x</p>')?.invariant,
    ).toBe(6);
    expect(
      checkEdit(PAGE, '<p className="text-[rgb(10,20,30)]">x</p>')?.invariant,
    ).toBe(6);
  });

  it("asks on rgb()/hsl()/oklch() literals", () => {
    expect(
      checkEdit(PAGE, 'style={{ color: "rgb(10, 20, 30)" }}')?.invariant,
    ).toBe(6);
    expect(
      checkEdit(PAGE, 'style={{ color: "oklch(0.7 0.1 250)" }}')?.invariant,
    ).toBe(6);
  });

  it("allows token-bound classes — the whole point of the rule", () => {
    expect(
      checkEdit(PAGE, '<div className="bg-background text-muted-foreground">'),
    ).toBeNull();
  });

  it("allows metadata images, which render standalone", () => {
    expect(
      checkEdit("src/app/opengraph-image.tsx", 'background: "#0f172a"'),
    ).toBeNull();
  });

  it("only applies to .tsx UI source, not .ts config", () => {
    expect(checkEdit("src/lib/logger.ts", 'const c = "#ff0000";')).toBeNull();
  });

  it("keeps the test-file escape hatch", () => {
    expect(
      checkEdit("src/app/page.test.tsx", 'expect(el).toHaveStyle("#fff")'),
    ).toBeNull();
  });
});

describe("invariant #4 — zod on server actions and routes", () => {
  it("asks (does not deny) when a server action takes input with no visible zod", () => {
    const action = `"use server";\nexport async function updateProfile(input: FormData) { return input; }`;
    const violation = checkEdit("src/features/profile/actions.ts", action);
    expect(violation?.decision).toBe("ask");
    expect(violation?.invariant).toBe(4);
  });

  it("stays quiet when the action parses its input", () => {
    const action =
      `"use server";\nimport { z } from "zod";\n` +
      `const Schema = z.object({ name: z.string() });\n` +
      `export async function updateProfile(input: FormData) { return Schema.parse(input); }`;
    expect(checkEdit("src/features/profile/actions.ts", action)).toBeNull();
  });

  it("asks on an unvalidated route handler", () => {
    const route =
      "export async function POST(request: Request) { return Response.json({}); }";
    expect(checkEdit("src/app/api/things/route.ts", route)?.invariant).toBe(4);
  });

  it("stays quiet on a server action that takes no input at all", () => {
    const action = `"use server";\nexport async function signOutAction() { await signOut(); }`;
    expect(checkEdit("src/features/auth/actions.ts", action)).toBeNull();
  });
});

describe("invariant #5 — Conventional Commits", () => {
  it("denies a non-conventional subject", () => {
    const violation = checkBash('git commit -m "fixed the thing"');
    expect(violation?.decision).toBe("deny");
    expect(violation?.invariant).toBe(5);
  });

  it("allows conventional subjects, with and without a scope", () => {
    expect(checkBash('git commit -m "feat: add profile page"')).toBeNull();
    expect(
      checkBash('git commit -m "fix(auth): reject empty password"'),
    ).toBeNull();
    expect(
      checkBash('git commit -m "refactor!: drop the legacy adapter"'),
    ).toBeNull();
  });

  it("reads the subject line only, ignoring the body", () => {
    expect(checkBash('git commit -m "feat: x\n\nfixed the thing"')).toBeNull();
  });

  it("ignores git commands that are not commits, and commits with no -m", () => {
    expect(checkBash("git status")).toBeNull();
    expect(checkBash("git commit --amend --no-edit")).toBeNull();
    expect(commitMessage("git push origin main")).toBeNull();
  });

  it("reads the -m of the commit, not the -m of some other git command", () => {
    // The regression: this denied a perfectly good `-F -` commit because it read
    // the TAG's message as the commit subject. A guard that fires on innocent
    // work gets switched off, and then it guards nothing.
    const command = `git commit -q -F - && git tag -a v0.2.0 -m "0.2.0 — the agent layer enforces"`;
    expect(commitMessage(command)).toBeNull();
    expect(checkBash(command)).toBeNull();
  });

  it("still catches a bad subject when a commit is chained with other commands", () => {
    const command = `git add -A && git commit -m "fixed stuff" && git push`;
    expect(checkBash(command)?.invariant).toBe(5);
  });

  it("does not parse prose inside a heredoc commit body as a command", () => {
    // The second regression, found the same way: a commit whose MESSAGE quotes a
    // broken command was denied, because the hook read the quoted example as a
    // real invocation. A guard that cannot tell a command from a sentence about
    // a command will eventually refuse honest work.
    const command = [
      "git commit -q -F - <<'EOF'",
      "fix(hooks): stop misreading a tag message",
      "",
      `The bug: \`git commit -F - && git tag -a v1 -m "1.0 — a title"\` denied the`,
      "commit, because the tag's -m was read as the subject.",
      "EOF",
    ].join("\n");
    expect(commitMessage(command)).toBeNull();
    expect(checkBash(command)).toBeNull();
  });

  it("does not read a later commit's message as an earlier one's", () => {
    const command = `git commit -m "feat: a" && git commit -m "nope"`;
    // The first `git commit` segment wins — that is the one being judged.
    expect(commitMessage(command)).toBe("feat: a");
  });
});

describe("test files are exempt", () => {
  it("lets a test write the very string the rule bans", () => {
    expect(
      checkEdit("src/features/nav/nav.test.tsx", '<a href="/dashboard">x</a>'),
    ).toBeNull();
    expect(
      checkEdit("tests/e2e/smoke.spec.ts", 'window.location.href = "/x";'),
    ).toBeNull();
  });
});

describe("the hook fails open", () => {
  it("allows anything it cannot understand", () => {
    expect(decide({})).toBeNull();
    expect(
      decide({ tool_name: "Read", tool_input: { file_path: PAGE } }),
    ).toBeNull();
    expect(decide({ tool_name: "Edit", tool_input: {} })).toBeNull();
    expect(
      decide({
        tool_name: "Bash",
        tool_input: { command: 42 as unknown as string },
      }),
    ).toBeNull();
  });

  it("still catches a violation carried in a normal Edit", () => {
    const violation = decide({
      tool_name: "Edit",
      tool_input: { file_path: PAGE, new_string: '<a href="/x">x</a>' },
    });
    expect(violation?.invariant).toBe(1);
  });

  it("inspects only the text an edit adds, not the text it removes", () => {
    const violation = decide({
      tool_name: "Edit",
      tool_input: {
        file_path: PAGE,
        old_string: '<a href="/x">x</a>',
        new_string: '<Link href="/x">x</Link>',
      },
    });
    expect(violation).toBeNull();
  });

  it("collects added text from every shape the tools use", () => {
    expect(addedText({ content: "a" })).toBe("a");
    expect(addedText({ new_string: "b" })).toBe("b");
    expect(
      addedText({ edits: [{ new_string: "c" }, { new_string: "d" }] }),
    ).toBe("c\nd");
    expect(addedText({ edits: "not-an-array" })).toBe("");
  });
});
