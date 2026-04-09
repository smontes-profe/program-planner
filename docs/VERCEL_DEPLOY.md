# Vercel Deployment Setup

El despliegue en Vercel está configurado a través de la **integración nativa de la App de Vercel para GitHub**. Ya no se utilizan flujos de Github Actions secundarios para lanzar comandos por CLI.

## 1. Comportamiento del despliegue (Workflow)

Vercel reacciona automáticamente a los eventos de GitHub:

- **Push / Pull Request hacia `develop`**: Despliegue entorno *Preview* (Staging).
- **Merge o Push directo a `main`**: Despliegue entorno *Production*.

### Criterios de calidad y Tests en Vercel

Por defecto, la integración de Vercel solo ejecuta la compilación de la app (`npm run build`, que incluye linters y typechecks integrados de Next.js). **No** ejecuta los tests unitarios ni E2E de Playwright (para evitar timeouts por sobrecarga en la plataforma de Vercel). 
El aseguramiento total de la calidad se garantiza obligando al equipo a usar  **Pull Requests** (donde sí se activa el `quality-gates.yml` de GitHub Actions antes de dejar integrar la rama).

## 2. Vercel Environment Variables

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
