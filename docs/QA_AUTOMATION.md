# QA Automation Contract

## 1. Required npm scripts
Add these scripts to `package.json` when the Next.js app scaffold is initialized:

```json
{
  "scripts": {
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest",
    "test:a11y": "playwright test tests/ui-quality/a11y.spec.mjs --config=playwright.ui-quality.config.mjs",
    "test:responsive": "playwright test tests/ui-quality/responsive.spec.mjs --config=playwright.ui-quality.config.mjs"
  }
}
```

## 2. Required devDependencies

```json
{
  "devDependencies": {
    "@axe-core/playwright": "^4.10.2",
    "@playwright/test": "^1.53.0"
  }
}
```

Install Playwright browsers:

```bash
npx playwright install --with-deps
```

## 3. Runtime variables
- `UI_TEST_BASE_URL`: base URL for UI quality tests. Default: `http://127.0.0.1:3000`.
- `UI_TEST_PATH`: path to test. Default: `/`.

## 4. CI behavior
- Workflow file: `.github/workflows/quality-gates.yml`.
- PR template: `.github/pull_request_template.md`.
- Script validation: `.github/scripts/validate-npm-scripts.mjs`.

If `package.json` is not present yet, quality workflow exits successfully with a skip message.
