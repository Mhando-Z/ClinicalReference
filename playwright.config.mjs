import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  timeout: 60000,
  use: { baseURL: "http://127.0.0.1:3000", headless: true, channel: "msedge", trace: "retain-on-failure" },
  workers: 1,
  webServer: { command: "node scripts/serve.mjs", url: "http://127.0.0.1:3000", reuseExistingServer: false, timeout: 30000 },
});
