import { z } from "zod";

const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  // App
  // Default port mirrors config/ports.ts APP_PORT (kept literal to avoid a
  // config/ -> src/ import; src/lib/ports.test.ts guards the two staying
  // in sync).
  NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3210"),

  // Observability
  SENTRY_DSN: z.url().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.url().optional(),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),

  // Analytics
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
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
