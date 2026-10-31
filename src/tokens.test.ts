import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return files(full);
    return /\.tsx$/.test(name) && !/\.test\.tsx$/.test(name) ? [full] : [];
  });
}

// Hard invariant #6: UI colors come from the santa-* tokens. Tailwind's own
// palette classes (bg-white, text-gray-500…) bypass them.
const PALETTE =
  /(?<![\w-])(bg|text|border|ring|outline|fill|stroke|from|to|via|divide|placeholder)-(white|black|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)(-\d{2,3})?(?![\w-])/;

describe("design tokens", () => {
  it("no component uses a Tailwind palette color class", () => {
    const offenders = files(path.join(process.cwd(), "src")).flatMap((file) =>
      readFileSync(file, "utf8")
        .split("\n")
        .flatMap((line, i) =>
          PALETTE.test(line)
            ? [`${path.relative(process.cwd(), file)}:${i + 1}`]
            : [],
        ),
    );
    expect(offenders).toEqual([]);
  });
});
