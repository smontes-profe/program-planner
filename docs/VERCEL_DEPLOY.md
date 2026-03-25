# Vercel Deployment Setup

## 1. Required GitHub Secrets
Configure these repository secrets in GitHub:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

Where to find each value:

### 1.1 `VERCEL_TOKEN`
- Vercel Dashboard -> account avatar -> `Settings` -> `Tokens`.
- Create a new token and copy it.

### 1.2 `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID`
Option A (recommended):
1. Install Vercel CLI locally.
2. Run `vercel link` in project root.
3. Open `.vercel/project.json` and copy:
   - `orgId` -> `VERCEL_ORG_ID`
   - `projectId` -> `VERCEL_PROJECT_ID`

Option B:
- Vercel Dashboard -> Project Settings -> General / project metadata.

## 2. Workflow Behavior
Workflow file: `.github/workflows/vercel-deploy.yml`

Triggers:
- push to `develop`
- push to `main`

Targets:
- `develop` -> Vercel Preview deployment
- `main` -> Vercel Production deployment

Safety behavior:
- If `package.json` does not exist yet: workflow skips deploy.
- If required Vercel secrets are missing: workflow fails with explicit message.

## 3. Vercel Environment Variables
Set these in Vercel project settings (Preview and Production as needed):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only)
- `SUPABASE_DB_DIRECT_URL` (if app server runtime uses direct DB access)

Recommended:
- Keep Production and Preview values separated.
- Never expose service role keys as public client variables.

## 4. First Dry Run Checklist
1. Add GitHub secrets.
2. Ensure Vercel env vars are configured.
3. Push a trivial commit to `develop`.
4. Verify preview deployment in Actions and Vercel dashboard.
5. Merge to `main` and verify production deployment.
