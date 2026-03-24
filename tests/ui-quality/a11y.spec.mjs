import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const uiPath = process.env.UI_TEST_PATH ?? "/";

test("page has no critical or serious accessibility violations", async ({ page }) => {
  await page.goto(uiPath);

  const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
  const criticalViolations = accessibilityScanResults.violations.filter((violation) => {
    return violation.impact === "critical" || violation.impact === "serious";
  });

  expect(
    criticalViolations,
    `Accessibility violations found: ${criticalViolations
      .map((violation) => `${violation.id} (${violation.impact})`)
      .join(", ")}`,
  ).toEqual([]);
});
