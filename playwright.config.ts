import { defineConfig, devices } from "@playwright/test";
import { APP_PORT } from "./config/ports";

const BASE_URL = `http://localhost:${APP_PORT}`;

/**
 * E2E smoke suite (spec §5.6-1: SPA-navigation gate + core golden-path
 * pages). `webServer` resets the local PGlite db, builds, and starts the
 * production server so tests run against a real build rather than `next
 * dev` — closer to what buyers ship. This makes the suite slow to boot
 * (a full `next build`), so give it a generous timeout. The suite always
 * boots its own server (`reuseExistingServer: false`) so it never silently
 * tests a running `pnpm dev` instead of the production build.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "desktop-chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 7"] },
    },
  ],
  webServer: {
    command: "pnpm db:reset && pnpm build && pnpm start",
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 5 * 60 * 1000,
    // `pnpm start` runs as a plain Node prod server (not on Vercel, which
    // is auto-trusted), so without this next-auth rejects every
    // /api/auth/* request with 500 UntrustedHost — see .env.example.
    // AUTH_SECRET is a dummy value (not a real secret) purely to silence
    // next-auth's MissingSecret warning noise in the e2e server logs; no
    // real session security depends on it for this local smoke suite.
    env: {
      AUTH_TRUST_HOST: "true",
      AUTH_SECRET: "e2e-dummy-secret-not-real",
      // Exercise the real credentials login instead of the dev bypass, so
      // the e2e suite proves the auth flow actually authenticates.
      AUTH_DEV_BYPASS: "false",
    },
  },
});
