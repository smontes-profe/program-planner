# Program Planner - CI/CD Strategy

## 1. Branching Model
- `main`: production branch.
- `develop`: integration/staging branch.
- `feature/*`: feature work branches.
- `fix/*`: bugfix branches.

## 2. Environment Mapping
- `feature/*` -> Vercel Preview environment.
- `develop` -> shared Development environment.
- `main` -> Production environment.

## 3. Pull Request Quality Gates
Every PR targeting `develop` or `main` must pass:
1. Lint
2. Typecheck
3. Unit tests (Vitest)
4. Accessibility checks (`test:a11y`)
5. Responsive snapshot checks (`test:responsive`)
6. Optional migration validation (if schema changed)

Merge is blocked if any mandatory gate fails.

## 4. Implemented GitHub Actions Workflows

### 4.1 `quality-gates.yml` (on PR)
Location: `.github/workflows/quality-gates.yml`

Behavior:
- If `package.json` does not exist yet, workflow reports skip and exits successfully.
- If `package.json` exists:
  - validates required scripts (`lint`, `typecheck`, `test`, `test:a11y`, `test:responsive`)
  - runs lint, typecheck, unit tests, a11y tests, and responsive snapshots
  - uploads UI quality artifacts (`test-results`, `playwright-report`, `artifacts/responsive-snapshots`)

### 4.2 `deploy.yml` (on push)
- Push to `develop`: deploy to Vercel development target.
- Push to `main`: deploy to Vercel production target.

### 4.3 `vercel-deploy.yml` (on push)
Location: `.github/workflows/vercel-deploy.yml`

Behavior:
- Trigger on push to `develop` and `main`.
- `develop` deploys as Vercel preview.
- `main` deploys as Vercel production.
- Requires GitHub secrets:
  - `VERCEL_TOKEN`
  - `VERCEL_ORG_ID`
  - `VERCEL_PROJECT_ID`
- If `package.json` is missing, deployment is skipped.
- If secrets are missing, workflow fails with explicit guidance.

## 5. Command Contract
See `docs/QA_AUTOMATION.md` for:
- required npm scripts
- required testing dependencies
- runtime variables for UI quality checks
- PR checklist template used in reviews

See `docs/VERCEL_DEPLOY.md` for:
- Vercel deployment secrets
- where to find each value
- first dry-run checklist

## 6. Vercel Integration Notes
- Connect repository to Vercel project.
- Use environment-specific variables:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (server-only)
  - other secrets required by integrations

## 7. Database Change Safety
- All schema changes via SQL migrations in repo.
- CI check should ensure migration files are ordered and valid.
- Production migration execution only from protected pipeline or manual approved step.

## 8. Release Checklist
1. All checks green on `develop`.
2. Smoke test on development deployment.
3. Merge `develop` into `main`.
4. Verify production deployment health.
5. Update docs if behavior changed.
