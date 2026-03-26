import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const uiPath = process.env.UI_TEST_PATH ?? "/";
const snapshotDir = path.join(process.cwd(), "artifacts", "responsive-snapshots");

const viewports = [
  { name: "mobile-320", width: 320, height: 740 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "desktop-1280", width: 1280, height: 900 },
];

test.beforeAll(() => {
  fs.mkdirSync(snapshotDir, { recursive: true });
});

for (const viewport of viewports) {
  test(`capture responsive snapshot at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto(uiPath);

    const snapshotPath = path.join(snapshotDir, `${viewport.name}.png`);
    await page.screenshot({ path: snapshotPath, fullPage: true });

    const stats = fs.statSync(snapshotPath);
    expect(stats.size).toBeGreaterThan(0);
  });
}
