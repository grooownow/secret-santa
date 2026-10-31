import { z } from "zod";

const schema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    GRIDFIN_DB: z.enum(["pglite", "remote"]).default("pglite"),
    DATABASE_URL: z.url().optional(),
    PGLITE_DATA_DIR: z.string().default(".pglite"),

    // App
    // Default port mirrors config/ports.ts APP_PORT (kept literal to avoid a
    // config/ -> src/ import; src/lib/ports.test.ts guards the two staying
    // in sync).
    NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3210"),

    // Auth (optional — skeleton boots with zero config)
    AUTH_SECRET: z.string().optional(),
    // Read by next-auth itself (not by our own code) to trust the
    // Host/X-Forwarded-Host header; required for `/api/auth/*` to work
    // under `pnpm start` and any other non-Vercel prod-mode host. See
    // .env.example for the full explanation.
    AUTH_TRUST_HOST: z.string().optional(),
    AUTH_GITHUB_ID: z.string().optional(),
    AUTH_GITHUB_SECRET: z.string().optional(),
    AUTH_GOOGLE_ID: z.string().optional(),
    AUTH_GOOGLE_SECRET: z.string().optional(),

    // Auth dev bypass: when true, requireUser() returns the seeded admin and
    // middleware lets /dashboard through — zero-friction local runs.
    //
    // Defaults to FALSE so it can never leak into a build or a production
    // server. `pnpm dev` turns it on via `.env.development`, which Next loads
    // only when NODE_ENV=development. Defaulting it to true would break
    // `pnpm build`: Next builds with NODE_ENV=production and evaluates this
    // module, so the guard below would reject a plain `pnpm build`.
    AUTH_DEV_BYPASS: z.stringbool().default(false),

    // Seed admin credentials (dev defaults; overridden per project via .env).
    // scripts/seed.ts hashes the password and refuses to run in production.
    SEED_ADMIN_EMAIL: z.email().default("admin@example.local"),
    SEED_ADMIN_PASSWORD: z.string().min(8).default("dev-admin-pw"),

    // Secret Santa
    // The organizer: the verified account with this email (case-insensitive)
    // gets /admin. Optional in dev; without it nobody is an organizer.
    ADMIN_EMAIL: z.email().optional(),
    // Gmail SMTP for transactional mail (an app password, not the account one).
    GMAIL_USER: z.email().optional(),
    GMAIL_APP_PASSWORD: z.string().optional(),
    // Shared secret for the daily Vercel cron endpoint.
    CRON_SECRET: z.string().optional(),
    // Vercel Blob token for participant and wall photos.
    BLOB_READ_WRITE_TOKEN: z.string().optional(),

    // Observability
    SENTRY_DSN: z.url().optional(),
    NEXT_PUBLIC_SENTRY_DSN: z.url().optional(),
    LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace"])
      .default("info"),

    // Analytics
    NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.GRIDFIN_DB === "remote" && !val.DATABASE_URL) {
      ctx.addIssue({
        code: "custom",
        path: ["DATABASE_URL"],
        message: "DATABASE_URL is required when GRIDFIN_DB=remote",
      });
    }

    if (val.NODE_ENV === "production" && val.AUTH_DEV_BYPASS) {
      ctx.addIssue({
        code: "custom",
        path: ["AUTH_DEV_BYPASS"],
        message:
          "AUTH_DEV_BYPASS must be false (or unset to false) when NODE_ENV=production",
      });
    }
  });

export type Env = z.infer<typeof schema>;

export function parseEnv(raw: Partial<NodeJS.ProcessEnv>): Env {
  const result = schema.safeParse(raw);
  if (!result.success) {
    const details = result.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("\n  ");
    throw new Error(`Invalid environment:\n  ${details}`);
  }
  return result.data;
}

export const env: Env = parseEnv(process.env);
