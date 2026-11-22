import { defineConfig, devices } from "@playwright/test";
import {
  E2E_COOKIE_SECRET,
  E2E_PASSWORD_HASH,
  FIXTURE_SOURCE,
} from "./tests/fixtures/sentinels.ts";

const PORT = 3200;

export default defineConfig({
  testDir: "tests/e2e",
  testMatch: "**/*.pw.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: `http://localhost:${PORT}`, trace: "off" },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    { name: "mobile", use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    command: `bun run start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      PROTECTED_CONTENT_SOURCE: FIXTURE_SOURCE,
      PORTFOLIO_PASSWORD_HASH: E2E_PASSWORD_HASH,
      PORTFOLIO_COOKIE_SECRET: E2E_COOKIE_SECRET,
    },
  },
});
