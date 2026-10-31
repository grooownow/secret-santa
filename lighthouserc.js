// Port is a literal here (CJS require can't load the TS source); it mirrors
// config/ports.ts APP_PORT and src/lib/ports.test.ts fails if they drift.
// (Kept as plain string literals, not a templated const, so the guard's
// raw-text scan of this file can actually find "localhost:3210".)
module.exports = {
  ci: {
    collect: {
      startServerCommand: "pnpm start",
      // The list is computed from the filesystem because a URL that 404s would
      // get scored anyway (the not-found page is fast), which reads as a
      // false-green budget on a page that does not exist.
      url: [
        "http://localhost:3210/",
        ...(require("node:fs").existsSync(
          require("node:path").join(__dirname, "src/app/signin"),
        )
          ? ["http://localhost:3210/signin"]
          : []),
      ],
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        "categories:performance": [
          "error",
          { minScore: 0.9, aggregationMethod: "median-run" },
        ],
        "categories:accessibility": [
          "error",
          { minScore: 0.9, aggregationMethod: "median-run" },
        ],
      },
    },
    upload: { target: "filesystem", outputDir: ".lighthouseci" },
  },
};
