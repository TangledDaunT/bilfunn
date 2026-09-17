import { defineConfig } from "@playwright/test";
const baseURL =
  process.env.PRODUCTION_E2E === "1"
    ? `https://localhost:${process.env.TEST_HTTPS_PORT || 3101}`
    : `http://localhost:${process.env.TEST_HTTP_PORT || 3100}`;
export default defineConfig({
  testDir: "tests/e2e",
  use: { baseURL, browserName: "chromium", ignoreHTTPSErrors: true },
  webServer: {
    command: "node scripts/test-local.mjs serve",
    url: `${baseURL}/api/health`,
    ignoreHTTPSErrors: true,
    reuseExistingServer: false,
    timeout: 120000,
  },
  workers: 1,
});
