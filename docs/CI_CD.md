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
4. Optional: migration validation (if schema changed)

Merge is blocked if any gate fails.

## 4. Recommended GitHub Actions Pipeline

### 4.1 `ci.yml` (on PR)
- Checkout
- Setup Node.js
- Install dependencies
- Run:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test -- --run`

### 4.2 `deploy.yml` (on push)
- Push to `develop`: deploy to Vercel development target.
- Push to `main`: deploy to Vercel production target.

## 5. Vercel Integration Notes
- Connect repository to Vercel project.
- Use environment-specific variables:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (server-only)
  - other secrets required by integrations

## 6. Database Change Safety
- All schema changes via SQL migrations in repo.
- CI check should ensure migration files are ordered and valid.
- Production migration execution only from protected pipeline or manual approved step.

## 7. Release Checklist
1. All checks green on `develop`.
2. Smoke test on development deployment.
3. Merge `develop` into `main`.
4. Verify production deployment health.
5. Update docs if behavior changed.
