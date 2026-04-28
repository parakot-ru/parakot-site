import { defineConfig, devices } from "@playwright/test";

const browserChannel = process.env.PLAYWRIGHT_BROWSER_CHANNEL || "chrome";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: {
    timeout: 15_000,
  },
  reporter: [
    ["list"],
    ["html", { open: "never" }],
  ],
  use: {
    ...devices["Desktop Chrome"],
    ...(browserChannel ? { channel: browserChannel } : {}),
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
});
