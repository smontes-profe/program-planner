# Program Planner - Task Backlog

Status legend:
- `[ ]` pending
- `[-]` in progress
- `[x]` done
- `[!]` blocked

## Phase 0 - Foundation and Decision Lock
- [x] Define baseline docs (`SPECS`, `ARCHITECTURE`, `AGENTS`, `TASKS`).
- [x] Add stack, CI/CD, MCP, and diagrams docs.
- [x] Lock architecture decisions D1-D8 (single DB + org model + visibility scopes + role model).
- [ ] Initialize Next.js 15 project (App Router, TypeScript strict).
- [ ] Configure Tailwind CSS + shadcn/ui + lucide-react.
- [ ] Configure Vitest with first domain test.
- [ ] Configure ESLint + Prettier + import sorting.

## Phase 1 - Organization and Access Foundation
- [ ] Create SQL schema for `organizations`.
- [ ] Create SQL schema for `organization_memberships`.
- [ ] Create SQL schema for `profiles` with `is_platform_admin`.
- [ ] Implement region catalog and `academic_year` normalization constraints.
- [ ] Implement RLS base policies for:
  - platform admin global access
  - org manager organization access
  - teacher own/write access

## Phase 2 - Curriculum Templates
- [ ] Implement `curriculum_templates` schema with unique version key.
- [ ] Implement template status flow (`draft`, `published`, `deprecated`).
- [ ] Enforce template immutability after publish.
- [ ] Implement `template_ra` and `template_ce`.
- [ ] Build template CRUD and publish flow.

## Phase 3 - Teaching Plan Core
- [ ] Implement `teaching_plans` schema with:
  - `organization_id`
  - `owner_profile_id`
  - `visibility_scope`
  - lineage fields
- [ ] Implement plan RA/CE CRUD.
- [ ] Implement hard invariant checks (RA=100, CE=100).
- [ ] Implement plan status transitions (`draft`, `ready`, `published`, `archived`).

## Phase 4 - Collaboration and Visibility
- [ ] Implement deep import/fork from template.
- [ ] Implement deep import/fork from published plan.
- [ ] Persist lineage (`source_*`, `imported_at`).
- [ ] Implement visibility-based read/import policy:
  - `private`
  - `organization`
  - `company`
- [ ] Ensure no automatic source sync after import.

## Phase 5 - Didactic Planning
- [ ] CRUD for didactic units (UT).
- [ ] Map UT <-> CE (many-to-many).
- [ ] Assign UT to trimester (`T1`, `T2`, `T3`).
- [ ] Build trimester coverage summaries.

## Phase 6 - Evaluation Engine
- [ ] CRUD for evaluation instruments.
- [ ] Support default and custom instrument types.
- [ ] Define CE coverage per instrument.
- [ ] Implement grade entry (`simple` and `advanced`).
- [ ] Implement aggregate calculations (CE, RA, final + completion metrics).
- [ ] Add unit tests for formulas and edge cases.

## Phase 7 - Organization Management and Admin
- [ ] Build organization member management for org managers.
- [ ] Build role assignment guardrails.
- [ ] Build platform admin moderation tools.

## Phase 8 - CI/CD and Release
- [ ] GitHub Actions: lint + typecheck + test on PR.
- [ ] Branch strategy: `develop` -> development deploy, `main` -> production deploy.
- [ ] Vercel environment segregation.
- [ ] Block merge on failed quality checks.

## Phase 9 - AI PDF Assistant (Optional, Post-MVP)
- [ ] Upload curriculum PDF.
- [ ] Extract draft RA/CE with AI pipeline.
- [ ] Teacher review and confirm extracted content.
- [ ] Save approved extraction as template draft.

## Ongoing Quality Tasks
- [ ] Keep docs consistent with implementation on every merge.
- [ ] Increase unit test coverage on critical domain logic.
- [ ] Add integration tests for key user flows.
