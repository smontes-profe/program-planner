import { defineConfig } from "@playwright/test";

const baseURL = process.env.UI_TEST_BASE_URL ?? "http://127.0.0.1:3000";

export default defineConfig({
  testDir: "tests/ui-quality",
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { outputFolder: "playwright-report" }]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
});
