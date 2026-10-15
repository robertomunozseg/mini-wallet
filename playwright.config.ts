import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  // The first visit to a route compiles it in dev mode, which can take longer than the 5 s default.
  expect: { timeout: 10_000 },
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    // Only applies when Playwright starts the server itself (not when it reuses a running one):
    // the "timeout" scenario waits 300 ms instead of 10 s.
    env: { MOCK_TIMEOUT_DELAY_MS: "300" },
  },
});
