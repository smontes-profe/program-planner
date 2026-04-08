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
- [x] Add Next.js agent operating skills guide.
- [x] Add local reusable skill package (`skills/nextjs-agent-ops`).
- [x] Add local reusable security skill package (`skills/supabase-rls-ops`).
- [x] Add local reusable testing skill package (`skills/nextjs-testing-ops`).
- [x] Add PR template with responsive/a11y/usability checklist.
- [x] Add CI quality-gates workflow scaffold for `test:a11y` and `test:responsive`.
- [x] Define responsive layout baseline (`320`, `768`, `1280` breakpoints).
- [x] Define accessibility acceptance checklist for core flows.
- [x] Define usability standards for loading, error, and empty states.
- [x] Initialize Next.js 15 project (App Router, TypeScript strict).
- [x] Configure Tailwind CSS + shadcn/ui + lucide-react.
- [x] Configure Vitest with first domain test.
- [x] Configure ESLint + Prettier + import sorting.

## Phase 1 - Organization and Access Foundation

- [x] Create SQL schema for `organizations`.
- [x] Create SQL schema for `organization_memberships`.
- [x] Create SQL schema for `profiles` with `is_platform_admin`.
- [x] Implement region catalog and `academic_year` normalization constraints.
- [x] Implement RLS base policies for:
  - platform admin global access
  - org manager organization access
  - teacher own/write access

## Phase 2 - Curriculum Templates

- [x] Implement `curriculum_templates` schema with unique version key.
- [x] Implement `template_ra` and `template_ce`.
- [x] Implement immutability triggers (published/deprecated templates).
- [x] Implement template status flow (`draft`, `published`, `deprecated`).
- [x] Build template CRUD and publish flow.

## Phase 1.5 - Auth UI & Access Security

- [x] Implement login/signup flow with Supabase Auth.
- [x] Implement initial organization creation/assignment for new users.
- [x] Fix: Apply missing database migrations (profiles, organizations, memberships).
- [x] Add session middleware for protected routes.

## Phase 2.5 - Curriculum Fixes and improvements

- [x] No se puede editar ni eliminar un RA ya creado.
- [x] Cuando intento guardar un CE nuevo asociado a un RA, sale este error: Error al añadir CE: Could not find the 'ra_id' column of 'template_ce' in the schema cache.
- [x] Debe de poder hacerse CRUD de criterios de evaluación para un RA. Ahora mismo solo se pueden crear. no se pueden editar ni eliminar.
- [x] EN la vista de un RA, además del botón de"Añadir Criterio", debería haber un "Añadir criterios" que permita añadir varios Criterios a la vez. El sistema debe identificar cuando hay un patrón típico de nombre de criterior (ej. "a) ","b) ".., separar usando esos patrones, usar el patrón ("a", "b") como código del criterio y luego el texto siguiente como la descripción. Por ejemplo, si pego "a) Se han caracterizado y diferenciado los modelos de ejecución de código en el servidor y en el cliente web. b) Se han identificado las capacidades y mecanismos de ejecución de código de los navegadores web." debería crear dos criterios, uno con código "a" y descripción "Se han caracterizado y diferenciado los modelos de ejecución de código en el servidor y en el cliente web." y otro con código "b" y descripción "Se han identificado las capacidades y mecanismos de ejecución de código de los navegadores web."
- [x] Permitir añadir RRAAs (y sus CCEE) en bloque de acuerdo a @specs.md (### Añadiendo RRAA en bloque).
- [x] El botón de elimimnar un RA: habría que asegurar que se puede eliminar un RA y sus CCEE asociados.
- [x] En la vista de un currículo, el botón de "Editar datos" no funciona.Intenta ir a "/edit" pero la página no existe.

## Phase 2.6 - Curriculum Refactoring (Pedagogical Alignment)

- [x] Remove weight-based constraints from curriculum templates (RAs and CEs).
- [x] Update domain schemas and types to remove weight fields.
- [x] Relax immutability of published templates to allow for corrections.
- [x] Simplify curriculum UI: remove weight displays and inputs.
- [x] Enable curriculum deletion if no active teaching plans are dependent on it.
- [x] Update ARCHITECTURE.md and ERD to reflect the decoupled model.

## Phase 3 - Teaching Plan Core

- [x] Implement `teaching_plans` schema with:
  - `organization_id`
  - `owner_profile_id`
  - `visibility_scope`
  - lineage fields

### Phase 3A - Plan Base + Resumen de Pesos ✅

- [x] Implement plan RA/CE CRUD (cloned from template via deep copy).
- [x] Implement global weight assignment for RAs in the teaching plan.
- [x] Implement trimester presence flags (active_t1/t2/t3) with auto-computed weights.
- [x] `/plans` list page with plan cards and status.
- [x] `/plans/[id]` detail page with Currículo tab (editable RA/CE clone) and Pesos tab.
- [x] Enable homepage link to /plans.

### Phase 3B - Unidades de Trabajo e Instrumentos

- [ ] Implement `plan_teaching_unit` schema with trimester assignment and hours field.
- [ ] Implement `plan_unit_ra` coverage table (which RAs a UT covers).
- [x] `/plans/[id]` tab: Unidades de Trabajo (CRUD + RA/CE assignment per UT).
- [x] Implement `evaluation_instruments` schema linked to a UT (Already done in migration).
- [x] Implement `instrument_ce_weight` (which CEs an instrument covers and with what %) (Already done in migration).
- [x] `/plans/[id]` tab: Instrumentos (CRUD + CE weight assignment per instrument).
- [ ] Computed weights panel: target vs. real comparison per RA (global + per trimester).

### Phase 3.5 - Teaching Plan Fixes and UX Improvements

- [x] Validar que al menos un trimestre esté seleccionado al crear una UT. Actualmente lanza un error de base de datos (`at_least_one_trimester_chk`) en inglés. El error debe ser descriptivo, en castellano y preservar los datos del formulario.

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

## Phase 5 - Teaching Planning (UTs e Instrumentos)

- [ ] CRUD for teaching units / Unidades de Trabajo (UT).
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
- [x] Add Vercel deploy workflow scaffold for `develop` (preview) and `main` (production).
- [x] Configure GitHub secrets (`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`).
- [x] Vercel environment segregation.
- [ ] Block merge on failed quality checks.

## Phase 8.1 - UX Quality Gates

- [x] Add automated accessibility checks in CI scaffold for critical pages/components.
- [x] Add responsive visual checks in CI scaffold for key breakpoints.
- [ ] Define release gate for unresolved accessibility blockers.

## Phase 8.2 - Mobile Progression

- [ ] Define mobile-read and mobile-light-edit acceptance criteria.
- [ ] Instrument analytics for mobile friction in core flows.
- [ ] Prioritize and execute high-impact mobile improvements.

## Phase 9 - AI PDF Assistant (Optional, Post-MVP)

- [ ] Upload curriculum PDF.
- [ ] Extract draft RA/CE with AI pipeline.
- [ ] Teacher review and confirm extracted content.
- [ ] Save approved extraction as template draft.

## Ongoing Quality Tasks

- [ ] Keep docs consistent with implementation on every merge.
- [ ] Enforce Next.js skills checklist in PR reviews.
- [ ] Track mobile usage friction and prioritize mobile improvements by impact.
- [ ] Increase unit test coverage on critical domain logic.
- [ ] Add integration tests for key user flows.
