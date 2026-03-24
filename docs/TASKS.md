# Program Planner - Task Backlog

Status legend:
- `[ ]` pending
- `[-]` in progress
- `[x]` done
- `[!]` blocked

## Phase 0 - Foundation
- [x] Define baseline docs (`SPECS`, `ARCHITECTURE`, `AGENTS`, `TASKS`).
- [x] Add stack, CI/CD, MCP, and diagrams docs.
- [ ] Initialize Next.js 15 project (App Router, TypeScript strict).
- [ ] Configure Tailwind CSS + shadcn/ui + lucide-react.
- [ ] Configure Vitest with first domain test.
- [ ] Configure ESLint + Prettier + import sorting.

## Phase 1 - Data Platform
- [ ] Create Supabase project structure and environment variables.
- [ ] Implement base SQL schema for profiles and teaching plans.
- [ ] Implement curriculum template schema (`template_ra`, `template_ce`).
- [ ] Implement RLS policies for teacher/admin/public access.
- [ ] Add migration workflow (local + CI verification).

## Phase 2 - Auth and Access
- [ ] Implement sign-up/sign-in with Supabase Auth.
- [ ] Add protected app routes (`/dashboard`, `/plans/*`).
- [ ] Add role guard middleware (`teacher`, `admin`).
- [ ] Implement optional MFA toggle (feature flagged).

## Phase 3 - Curriculum Management
- [ ] CRUD for curriculum templates.
- [ ] CRUD for RA and CE in templates.
- [ ] Curriculum versioning by region/module/year/version.
- [ ] Manual curriculum creation flow (day-1 mandatory path).
- [ ] Publish/unpublish template flow with validation.

## Phase 4 - Teaching Plan Core
- [ ] Create teaching plan from scratch.
- [ ] Import/fork from public template (deep copy + lineage).
- [ ] CRUD for plan RA/CE.
- [ ] Weight validation engine (RA=100, CE=100).
- [ ] Plan readiness status (`draft`, `ready`, `published`).

## Phase 5 - Didactic Planning
- [ ] CRUD for didactic units (UT).
- [ ] Map UT <-> CE (many-to-many).
- [ ] Assign UT to trimester (`T1`, `T2`, `T3`).
- [ ] Build trimester coverage summaries (RA/CE/UT percentages).

## Phase 6 - Evaluation Engine
- [ ] CRUD for evaluation instruments.
- [ ] Support default and custom instrument types.
- [ ] Define CE coverage per instrument.
- [ ] Implement grade entry (`simple` and `advanced` modes).
- [ ] Implement aggregate calculations (CE, RA, final).
- [ ] Add unit tests for all formula and edge cases.

## Phase 7 - Collaboration
- [ ] Public/private visibility for teaching plans.
- [ ] Import public plan as independent clone.
- [ ] Add source lineage metadata and source version.
- [ ] Add "share improvements" republish flow.

## Phase 8 - Admin Panel
- [ ] User list and role management.
- [ ] Permission override tools for admins.
- [ ] Basic moderation actions for public content.

## Phase 9 - AI PDF Assistant (Optional, Post-MVP)
- [ ] Upload curriculum PDF.
- [ ] Extract draft RA/CE with AI pipeline.
- [ ] Teacher review UI for extracted results.
- [ ] Save approved structure as template.

## Phase 10 - CI/CD and Release
- [ ] GitHub Actions: lint + typecheck + test on PR.
- [ ] Branch strategy: `develop` -> preview, `main` -> production.
- [ ] Vercel project linkage and env segregation.
- [ ] Block merge if checks fail.

## Ongoing Quality Tasks
- [ ] Keep docs consistent with implementation on every merge.
- [ ] Increase unit test coverage on critical domain logic.
- [ ] Add integration tests for critical user flows.
