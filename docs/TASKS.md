# Program Planner - Task Backlog

Status legend:

- `[ ]` pending
- `[-]` in progress
- `[x]` done
- `[!]` blocked


## Phase 3 - Teaching Plan Core

- [x] Implement `teaching_plans` schema with:
  - `organization_id`
  - `owner_profile_id`
  - `visibility_scope`
  - lineage fields





## Phase 3.6 - Evaluaciones

Nuevo módulo de Evaluaciones al mismo nivel que Plantillas de Currículo y Programaciones. Permitirá registrar las calificaciones de cada alumno para cada instrumento de cada módulo (usando una programación como base) y calcular automáticamente la nota de cada alumno por trimestre y por RA.

### 3.6.1 - Gestión del Alumnado

- [x] Tabla `evaluation_students` con campos: `id`, `evaluation_context_id`, `student_name`, `student_email` (nullable), `active`, `created_at`.
- [x] CRUD completo de alumnos (crear, editar, eliminar).
- [x] Importación masiva de alumnado desde CSV (columnas mínimas: nombre, email opcional).
- [ ] Validación de CSV con preservación de datos en caso de error.
- [x] Asegurar que la importación CSV también persiste el código de estudiante (`student_code`) y los apellidos extraídos del archivo (no solo nombre y email).
- [ ] UI de lista de alumnos con búsqueda y filtrado por módulo/programación.

### 3.6.2 - Contexto de Evaluación

- [x] Tabla `evaluation_contexts` con campos: `id`, `organization_id`, `academic_year`, `title`, `created_by_profile_id`, `status` (`draft`, `active`, `closed`), `created_at`.
- [x] CRUD de contextos de evaluación (crear, editar, eliminar, cambiar estado).
- [x] Selección de módulos a calificar: tabla intermedia `evaluation_context_modules` que vincula `evaluation_context_id` con `teaching_plan_id`.
- [x] Solo se pueden seleccionar programaciones con `status = 'published'`.
- [ ] Las programaciones seleccionadas son de solo lectura desde el módulo de Evaluaciones (no se pueden modificar).
- [ ] Vista de configuración del contexto de evaluación: resumen de módulos vinculados y alumnos asignados.
- [x] Ajustar el panel de configuración para truncar nombres largos (>22 caracteres) con tooltip, eliminar el botón de desvincular (la desvinculación se logra asignando otra programación) y pedir confirmación antes de vincular un nuevo módulo.
- [x] Permitir editar título y curso académico del contexto, y seleccionar programaciones vinculadas desde la misma vista (creación/edición).

### 3.6.3 - Matriz de Notas de Instrumentos

- [x] Tabla `instrument_student_scores` con campos: `id`, `evaluation_context_id`, `instrument_id`, `student_id`, `score_value`, `score_date`, `notes`, `created_at`, `updated_at`.
- [x] Vista de matriz de notas: filas = alumnos, columnas = instrumentos (agrega scroll horizontal si es necesario y muestra código + nombre en cada columna).
- [x] Celdas editables con entrada directa de nota (modo `simple` por defecto; cada instrumento solo admite una nota 0-10 y el motor la distribuye a RAs/CEs según sus pesos).
- [x] Importación masiva de notas desde CSV: columnas = código de instrumento, filas = alumno. Validación de códigos de instrumento contra la programación vinculada.
- [ ] Validación de CSV con preservación de datos en caso de error y reporte de errores por fila/columna.
- [x] Los instrumentos deben tener su código correctamente asignado (requisito previo desde Phase 3B).

### 3.6.4 - Cálculo Automático de Notas por Trimestre y RA

- [x] Vista de solo lectura: notas calculadas por alumno, trimestre y RA.
- [x] Cálculo automático basado en:
  - Notas de instrumentos por alumno.
  - Pesos de RA en el plan (`weight_global`).
  - Pesos de CE por RA (`weight_in_ra`).
  - Cobertura de CE por instrumento (`coverage_percent` derivado de RA coverage × CE share).
  - Trimestre de cada UT (para notas por trimestre).
- [x] Fórmulas existentes reutilizadas del motor de notas (ver SPECS.md sección 6 - Grade Engine).
- [x] Panel resumen por alumno: nota final del módulo, notas por trimestre, notas por RA.
- [x] Panel resumen global: estadísticas del grupo (media, mediana, desviación).

### 3.6.5 - Exportación de Notas

- [x] Exportar notas por alumno en CSV: columnas = nombre, email, nota final, notas por RA, notas por trimestre.
- [ ] Exportar matriz completa de instrumentos en CSV: filas = alumnos, columnas = instrumentos + notas calculadas.
- [ ] Exportar acta de evaluación: documento resumen con notas finales por alumno y estadísticas del grupo.

### 3.6.6 - UI y Navegación

- [x] Nueva sección "Evaluaciones" en el menú principal (al mismo nivel que Plantillas y Programaciones).
- [x] Lista de contextos de evaluación (`/evaluations`).
- [x] Vista de detalle de contexto (`/evaluations/[id]`) con sub-pestañas:
  - Alumnado
  - Matriz de notas
  - Notas calculadas (solo lectura)
  - Exportación
- [ ] Responsive y accesible (breakpoints 320px, 768px, 1280px).
- [x] Estados vacíos, de carga y error implementados.

### 3.6.7 - Autorización y RLS

- [x] Políticas RLS para `evaluation_contexts`: solo miembros de la organización con rol `teacher` o superior pueden ver/editar sus contextos.
- [x] Políticas RLS para `evaluation_students`: acceso vinculado al contexto de evaluación.
- [x] Políticas RLS para `instrument_student_scores`: acceso vinculado al contexto de evaluación y permisos del usuario.
- [x] Los `org_manager` pueden ver todos los contextos de su organización.
- [x] Los `platform_admin` tienen acceso global.

### 3.6.8 - Ajustes visuales y de UX

- [x] Truncar RA y CE en la vista del currículum exactamente igual que en la sección de programaciones, añadiendo tooltip para mostrar el texto completo.
- [x] Asegurar que todos los `Number` steppers relevantes suben/bajan de 1 en 1, no de 0,01 en 0,01.
- [x] Revisar y homogenizar los mensajes de error visibles para que sean claros y estén en castellano.
- [x] Ajustar la pantalla de instrumentos: tipografía ligeramente más pequeña para el nombre, truncamiento a 20 caracteres con tooltip, y redistribuir espacios (menos para tipo/UT/RA, más para CEs).

### Phase 3.7 - Futuro: Congelación de notas por trimestre (Opción B)

> **Nota:** Esta tarea se implementará después del MVP, cuando sea necesario proteger las notas de trimestres ya cerrados ante cambios de pesos.

- [ ] Definir concepto de "trimestre cerrado": las notas calculadas de un trimestre se congelan y no se ven afectadas por cambios futuros de pesos.
- [ ] Mecanismo para que el profesor "cierre" un trimestre explícitamente.
- [ ] El motor de notas debe usar dos conjuntos de pesos:
  - Pesos vigentes al cierre del trimestre → para notas ya calculadas.
  - Pesos actuales → para trimestres abiertos y futuras entradas de notas.
- [ ] UI para mostrar qué pesos se usaron en cada trimestre y permitir revisar histórico.
- [ ] Auditoría de cambios de pesos con fecha y responsable.

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

### Phase 3A - Plan Base + Resumen de Pesos ✅

- [x] Implement plan RA/CE CRUD (cloned from template via deep copy).
- [x] Implement global weight assignment for RAs in the teaching plan.
- [x] Implement trimester presence flags (active_t1/t2/t3) with auto-computed weights.
- [x] `/plans` list page with plan cards and status.
- [x] `/plans/[id]` detail page with Currículo tab (editable RA/CE clone) and Pesos tab.
- [x] Enable homepage link to /plans.

### Phase 3B - Unidades de Trabajo e Instrumentos

- [x] Implement `plan_teaching_unit` schema with trimester assignment and hours field.
- [x] Implement `plan_unit_ra` coverage table (which RAs a UT covers).
- [x] `/plans/[id]` tab: Unidades de Trabajo (CRUD + RA/CE assignment per UT).
- [x] Implement `evaluation_instruments` schema linked to a UT (Already done in migration).
- [x] Implement `instrument_ce_weight` (which CEs an instrument covers and with what %) (Already done in migration).
- [x] `/plans/[id]` tab: Instrumentos (CRUD + CE weight assignment per instrument).
- [x] Añadir en la edición de instrumentos la entrada de porcentaje por RA cubierta y exigir que los porcentajes de CE dentro de cada RA sumen 100 % para poder derivar la aportación a cada CE.
- [x] Añadir la opción “Automatizar pesos de CEs” en el tab de Pesos: permitir fijar la distribución por CE dentro de cada RA, validar que suma 100 % y que los instrumentos hereden esos pesos cuando está activada.
- [x] Computed weights panel: target vs. real comparison per RA (global + per trimester).

### Phase 3.5 - Teaching Plan Fixes and UX Improvements

- [x] Validar que al menos un trimestre esté seleccionado al crear una UT. Actualmente lanza un error de base de datos (`at_least_one_trimester_chk`) en inglés. El error debe ser descriptivo, en castellano y preservar los datos del formulario.

- [x] Simplificar estados de programación a `draft` y `published` (eliminar `ready` y `archived` del MVP):
  - [x] Actualizar constraint DB de `status` a solo `draft` | `published`.
  - [x] Actualizar tipo TypeScript `PlanStatus` y schema Zod.
  - [x] Server Action `publishPlan(planId)`: cambia `draft → published`. No requiere validación bloqueante de invariantes.
  - [x] Server Action `unpublishPlan(planId)`: cambia `published → draft`.
  - [x] Una programación `published` es visible y seleccionable desde el módulo de Evaluaciones.
  - [x] Una programación `published` se puede seguir editando sin cambiar su estado (los cambios de peso se recalculan sobre todas las notas existentes — ver nota de Opción B a futuro).
  - [x] Panel de avisos en la vista de programación que muestre:
    - RAs cuyo `weight_global` no suma 100%.
    - Instrumentos sin pesos de RA definidos.
    - CE sin pesos definidos dentro de un RA.
  - [x] Botones de publicar/despublicar en la vista de detalle del plan.
  - [x] Actualizar badges de status en lista y detalle (solo `draft` = "Borrador", `published` = "Publicada").
 - [x] BUGFIX for github action
