import { defineConfig } from "@playwright/test";

const port = Number(process.env.PLAYWRIGHT_PORT || 3100);

export default defineConfig({
  testDir: "./tests/browser",
  timeout: 60000,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    headless: true,
    channel: "msedge",
    trace: "retain-on-failure",
  },
  workers: 1,
  webServer: {
    command: "node scripts/serve.mjs",
    url: `http://127.0.0.1:${port}`,
    env: { PORT: String(port) },
    reuseExistingServer: false,
    timeout: 30000,
  },
});
