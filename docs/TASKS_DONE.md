# Program Planner - Finished Tasks repository

(to see the pending and onging tasks, check the TASKS.md file).

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

### Phase 1.6 - Auth Hardening (Urgente Producción)

- [x] Corregir registro con email ya existente: no mostrar éxito falso cuando `signUp` no crea una cuenta usable.
- [-] Implementar recuperación de contraseña funcional (flujo completo de solicitud + actualización) o degradar explícitamente como `WIP` si hay bloqueo técnico real.
- [x] Habilitar espacio para usuarios autenticados donde puedan cambiar su contraseña de forma segura.

### Phase 1.7 - Acceso Gestionado por Admin (Crítico)

- [x] Convertir el registro público en "Solicitar acceso" (nombre, email, contraseña solicitada) y retirar el alta directa desde login.
- [x] Asignar `platform_admin` al usuario `smontes@ilerna.com` para gestión centralizada.
- [x] Implementar tabla `access_requests` y flujo de revisión (pendiente, aprobada, rechazada).
- [x] Crear panel de administración para revisar solicitudes y aprobar/rechazar.
- [x] En aprobación, crear usuario y permitir asignar tipo de cuenta (`admin` o `usuario normal`) y organización de destino.
- [x] Añadir listado de usuarios existentes en panel admin y permitir cambiar privilegio de `platform_admin`.
- [-] Revisar notificaciones por email para nuevas solicitudes y resolución (si no es viable ahora, dejarlo explicitado como pendiente).
- [x] Corregir cierre de sesión en navbar (asegurar ejecución real del `signOutAction`).
- [x] Permitir alta directa de usuarios desde panel admin (nombre, email, contraseña, tipo de cuenta y organización).
- [x] Corregir warning Base UI en `request-access` por cambio de `defaultValue` en campos no controlados tras submit.
- [x] En aprobación de solicitudes, permitir dejar en blanco el reemplazo de contraseña para mantener la contraseña solicitada originalmente.

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
- [x] Botones de publicar/despublicar en la vista de detalle del plan.
  - [x] Actualizar badges de status en lista y detalle (solo `draft` = "Borrador", `published` = "Publicada").
- [x] BUGFIX for github action

## Phase 3.6 - Evaluaciones

Nuevo módulo de Evaluaciones al mismo nivel que Plantillas de Currículo y Programaciones. Permitirá registrar las calificaciones de cada alumno para cada instrumento de cada módulo (usando una programación como base) y calcular automáticamente la nota de cada alumno por trimestre y por RA.

### 3.6.1 - Gestión del Alumnado

- [x] Tabla `evaluation_students` con campos: `id`, `evaluation_context_id`, `student_name`, `student_email` (nullable), `active`, `created_at`.
- [x] CRUD completo de alumnos (crear, editar, eliminar).
- [x] Importación masiva de alumnado desde CSV (columnas mínimas: nombre, email opcional).
- [x] Validación de CSV con preservación de datos en caso de error.
- [x] Asegurar que la importación CSV también persiste el código de estudiante (`student_code`) y los apellidos extraídos del archivo (no solo nombre y email).
- [x] UI de lista de alumnos con búsqueda y filtrado por módulo/programación.
- [x] El botón de "Seleccionar CSV de Moodle" que ponga "importar CSV". Que tenga al lado un botón redondito de "I" (de información), que muestre un tooltip con el formato esperado del CSV. Colocar estos dos botones arriba, antes de la fila de añadir nuevo alumno.
- [x] Mover el campo de "Buscar alumno..." entre la fila de añadir alumno y la tabla de alumnos, y a la izquierda en lugar de a la derecha.
- [x] En la sección Alumnado: Permitir edición inline de Apellidos, nombre, email de alumnos.

### 3.6.2 - Contexto de Evaluación

- [x] Tabla `evaluation_contexts` con campos: `id`, `organization_id`, `academic_year`, `title`, `created_by_profile_id`, `status` (`draft`, `active`, `closed`), `created_at`.
- [x] CRUD de contextos de evaluación (crear, editar, eliminar, cambiar estado).
- [x] Selección de módulos a calificar: tabla intermedia `evaluation_context_modules` que vincula `evaluation_context_id` con `teaching_plan_id`.
- [x] Solo se pueden seleccionar programaciones con `status = 'published'`.

- [x] Ajustar el panel de configuración para truncar nombres largos (>22 caracteres) con tooltip, eliminar el botón de desvincular (la desvinculación se logra asignando otra programación) y pedir confirmación antes de vincular un nuevo módulo.
- [x] Permitir editar título y curso académico del contexto, y seleccionar programaciones vinculadas desde la misma vista (creación/edición).

### 3.6.3 - Matriz de Notas de Instrumentos

- [x] Tabla `instrument_student_scores` con campos: `id`, `evaluation_context_id`, `instrument_id`, `student_id`, `score_value`, `score_date`, `notes`, `created_at`, `updated_at`.
- [x] Vista de matriz de notas: filas = alumnos, columnas = instrumentos (agrega scroll horizontal si es necesario y muestra código + nombre en cada columna).
- [x] Celdas editables con entrada directa de nota (modo `simple` por defecto; cada instrumento solo admite una nota 0-10 y el motor la distribuye a RAs/CEs según sus pesos).
- [x] Importación masiva de notas desde CSV: columnas = código de instrumento, filas = alumno. Validación de códigos de instrumento contra la programación vinculada.

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
- [x] Ordenar las tablas de notas calculadas por apellidos/nombre y reemplazar el actual desglose por RA con una tabla tipo matriz (primer columna: alumno, columna por RA), con iconos de alerta para RAs sin evaluar (círculo rojo) o con evaluación parcial (triángulo naranja) y colores para las notas (<5 rojo, resto verde). Leyenda visual añadida antes de cada tabla.
- [x] Notas calculadas: dividir columnas T1, T2 y T3 en nota autocalculada y nota ajustada.
  - Nota autocalculada: valor calculado para cada alumno segun pesos de RA/CE evaluados en ese trimestre (sin efecto PRI/PMI).
  - Nota ajustada: por defecto es floor(nota autocalculada) (entero sin decimales), pero el usuario la puede editar manualmente.
  - Persistencia de ajuste manual: cuando nota ajustada se modifica a mano, se conserva ese valor aunque cambie la nota autocalculada.
  - Locks globales por trimestre (T1/T2/T3 abierta-cerrada): al cerrar, se congela solo la autocalculada; la ajustada sigue editable manualmente.
  - Alertas: si falta algun RA o CE por evaluar en el trimestre, mostrar simbolo de alerta tanto en autocalculada como en ajustada.
  - Indicador de override: si la nota ajustada fue modificada manualmente, mostrar simbolo especifico.
  - Colores: borde verde/rojo en nota ajustada; texto verde/rojo en autocalculada.
- [x] Notas calculadas por RA: dividir cada RA en nota original y nota mejorada.
  - Nota original: calculo actual con instrumentos estandar ponderados.
  - Nota mejorada auto: aplica PRI/PMI del alumno para ese RA (si hay varios, usar el de fecha mas reciente).
  - Nota mejorada manual: si el docente la ajusta a mano, deja de recalcular y solo puede cambiarse manualmente.
  - Tooltip en nota mejorada: listar PRIs/PMIs que afectan a ese RA para ese alumno y sus notas.
  - Iconos alerta: circulo rojo (sin evaluar) y triangulo naranja (parcial) en columnas original y mejorada.
- [x] Nota final del modulo: dos columnas y cambio de formula base.
  - Nota final autocalculada: calcular siempre desde RAs originales y sus pesos (no desde medias trimestrales).
  - Nota final mejorada auto: calcular desde RAs mejorados y sus pesos.
  - Nota final mejorada manual: editable por docente; si se modifica a mano queda fija y solo cambia manualmente.
  - Mostrar indicador visual cuando la nota final mejorada se haya ajustado manualmente.
  - Alerta en nota final autocalculada si hay datos incompletos.
- [x] UX polish tabla de notas (2026-04-16):
  - Reducir padding de celdas numericas (px-3 -> px-1.5) y ancho de inputs (74/80px -> 52px, h-8 -> h-7).
  - Reducir min-width de tablas (trimestres: 1180px -> 820px, RA: 980px -> 600px).
  - Icono boli (PencilLine) clickable en columnas Ajustada (trimestre) y Mejorada (RA y Final): al hacer click borra el override manual y revierte al valor autocalculado. Tooltip de aviso incluido.
  - Nuevas Server Actions: `deleteTrimesterAdjustedOverride`, `deleteRAManualOverride`, `deleteFinalManualOverride` en `actions.ts`.

### 3.6.5 - Exportación de Notas

- [x] Exportar notas por alumno en CSV: columnas = nombre, email, nota final, notas por RA, notas por trimestre.
  - Exportacion mejorada (2026-04-16): ordenacion por apellidos/nombre, columnas Codigo+Apellidos+Nombre separadas, escape correcto de campos CSV con comas/comillas, columnas RA original/mejorada y trimestre auto/ajustada ya incluidas.

### 3.6.x - Bugs corregidos (2026-04-16)

- [x] Bug PostgREST: "more than one relationship found for evaluation_contexts and evaluation_students". Causa: `instrument_student_scores` tambien tiene FK a `evaluation_contexts` con columna `student_id`, lo que genera ambiguedad. Fix: usar sintaxis `!constraint_name` en el embed de Supabase (`evaluation_students!evaluation_students_context_id_fkey`). Ver `actions.ts:listEvaluationContexts`.

### 3.6.6 - UI y Navegación

- [x] Nueva sección "Evaluaciones" en el menú principal (al mismo nivel que Plantillas y Programaciones).
- [x] Lista de contextos de evaluación (`/evaluations`).
- [x] Vista de detalle de contexto (`/evaluations/[id]`) con sub-pestañas:
  - Alumnado
  - Matriz de notas
  - PRIS/PMIS
  - Notas calculadas (solo lectura)
  - Exportación
- [ ] Responsive y accesible (breakpoints 320px, 768px, 1280px).
- [x] Estados vacíos, de carga y error implementados.
- [x] Corregir lint de `GradesTab` por hooks condicionales (`useMemo`) para que el workflow de GitHub no falle.

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

### 3.6.9 - PRIS/PMIS (Instrumentos especiales de recuperacion/mejora)

- [x] Instrumentos: añadir checkbox único `PRI/PMI` en alta/edición.
- [x] Instrumentos `PRI/PMI`: permitir seleccionar solo RAs afectados (sin pesos RA, sin pesos CE, sin edición CE).
- [x] Motor: excluir instrumentos `PRI/PMI` del cálculo trimestral y de la matriz de notas estándar.
- [x] Nueva pestaña/sección `PRIS/PMIS` después de `Matriz de notas`.
- [x] Tabla `PRIS/PMIS`: filas de alumnos ordenados por apellidos/nombre y columnas por instrumento `PRI/PMI`.
- [x] Celdas `PRIS/PMIS`: numeric stepper por alumno/instrumento; valor vacío = alumno no participante.
- [x] Regla de reemplazo RA: si hay varios `PRI/PMI` para un RA/alumno y no hay override manual, usar la nota con fecha más reciente.
- [x] Overrides manuales RA mejorada: persistencia y precedencia total sobre recálculo.
- [x] Indicadores visuales en RA mejorada y nota final mejorada cuando haya override manual.
- [x] Actualizar exportaciones para incluir columnas nuevas (RA original/mejorada y notas finales original/mejorada) y excluir PRI/PMI de la matriz estándar.
- [ ] Cobertura de tests del motor para: reemplazo por fecha, `null -> valor` por PRI/PMI, y precedencia de override manual.

## Phase 3.7 - Evaluaciones: Mejoras pendientes

- [x] Matriz de notas: Añadir selectores justo antes de la tabla (después del texto de explicación de imprtar csv), para poder marcar T1, T2, T3. Por defecto, deben estar marcados todos los trimestres. Si se modifican, la tabla debe mostrar solo las notas de los instrumentos correspondientes a los trimestres marcados.
- [x] Matriz de notas: Validación de CSV con preservación de datos en caso de error y reporte de errores por fila/columna.
- [x] Matriz de notas: cuando hay scroll horizontal no se aprecia bien si estás en la parte de arriba de la tabla.
- [x] Matriz de notas: cambiar los numeric stepper por campos input a secas.
- [x] Exportación de notas: Cambiar la parte de notas por alumno por "Notas trimestrales" y Permitir exportar notas por trimestre de todas los alumnos.
- [x] Exportación de notas: Después de "Notas trimestrales" añadir un bloque nuevo de "Notas por RAs" que permita exportar las notas de los alumnos por RAs y CEs.
- [x] Exportación de notas: Después de "Notas por RAs" añadir un bloque nuevo de "Notas por instrumentos" que permita exportar las notas de los alumnos por instrumentos. Añadir un check de "incluir PRI/PMI" para que se muestren o no.
- [x] Exportación de notas: Eliminar la parte de "Listado de alumnos" por "Acta de evaluacion": documento resumen con notas finales por alumno y estadisticas del grupo.

## Phase 8 - CI/CD and Release

- [x] GitHub Actions: lint + typecheck + test on PR (via quality-gates.yml).
- [x] Branch strategy: `develop` -> development deploy, `main` -> production deploy (managed by Vercel).
- [x] Configure GitHub secrets (`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`).
- [x] Vercel environment segregation.
- [x] Corregir tipado del Route Handler `import-grades` para Next 16 (`params` como `Promise`) y evitar fallo de `next build` en Vercel.

## Phase 8.1 - UX Quality Gates

- [x] Add automated accessibility checks (manual trigger via workflow_dispatch).
- [x] Add responsive visual checks in CI scaffold for key breakpoints.
- [x] Define release gate for unresolved accessibility blockers (Manual Review).
