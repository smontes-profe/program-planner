# Program Planner - Technology Stack

## 1. Core Platform
- `Next.js 15+` (App Router): UI, routing, server rendering, Server Actions.
- `TypeScript` (strict): domain-safe implementation and compile-time guarantees.
- `Node.js LTS`: runtime baseline for local and CI environments.

## 2. Frontend
- `Tailwind CSS`: utility-first styling and responsive layout.
- `shadcn/ui`: composable UI primitives integrated in project codebase.
- `lucide-react`: icon set.
- `React Hook Form` + `Zod` (recommended): typed form handling and validation.
- `next-themes` (optional): controlled theme support without accessibility regressions.

## 3. Backend and Data
- `Supabase Auth`: authentication and session management.
- `PostgreSQL (Supabase)`: relational storage for curriculum/planning/evaluation.
- `Row Level Security (RLS)`: tenant-level data isolation.
- `Supabase Storage` (optional): files such as curriculum PDFs.

## 4. Testing and Quality
- `Vitest`: unit tests, especially grade engine and weight validators.
- `@testing-library/react` (recommended): component behavior tests.
- `axe-core` / `jest-axe` (recommended): accessibility regression checks.
- `Lighthouse CI` (recommended): performance + accessibility budget tracking.
- `ESLint` + `Prettier`: static quality and style consistency.

## 5. Delivery
- `GitHub Actions`: CI pipelines for lint/typecheck/tests.
- `Vercel`: hosting and preview deployments.

## 6. Architectural Conventions
- No mandatory REST API for internal app flows; prefer Server Actions.
- Shared domain logic in pure functions under a dedicated domain module.
- Validation at entry points:
  - forms
  - Server Actions
  - imports (template or PDF-assisted)
- Persist only normalized percentages (`0-100`) and normalize at computation boundaries.
- Build UI with responsive-first layouts and semantic HTML landmarks.
- Treat accessibility as a release quality gate, not a post-release improvement.

## 7. Language Policy
- Code artifacts (variables, methods, types, tables, columns) in English.
- UI labels and comments in Spanish.

## 8. Why This Stack
- High delivery speed for CRUD + business logic.
- Strong type safety for sensitive percentage-based rules.
- Minimal backend boilerplate with secure data policies via RLS.
- Smooth CI/CD path with GitHub + Vercel integration.
