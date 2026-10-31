import { defineConfig, devices } from "@playwright/test";
import { APP_PORT } from "./config/ports";

const BASE_URL = `http://localhost:${APP_PORT}`;

/**
 * E2E smoke suite (spec §5.6-1: SPA-navigation gate + core golden-path
 * pages). `webServer` builds and starts the production server so tests run
 * against a real build rather than `next dev` — closer to what buyers ship.
 * This makes the suite slow to boot (a full `next build`), so give it a
 * generous timeout. The suite always boots its own server
 * (`reuseExistingServer: false`) so it never silently tests a running
 * `pnpm dev` instead of the production build.
 *
 * Landing has no database or auth: the persistence module overwrites this
 * file (its copy under modules/persistence/files/) to prepend `pnpm db:reset`
 * and set the AUTH_* env its auth e2e spec needs.
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
    command: "pnpm build && pnpm start",
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 5 * 60 * 1000,
  },
});
