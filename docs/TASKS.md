# Program Planner - Task Backlog

Status legend:

- `[ ]` pending
- `[-]` in progress
- `[x]` done
- `[!]` blocked

(Old finished tasks can be found in TASKS_DONE.md)

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
- [x] Validación de CSV con preservación de datos en caso de error.
- [x] Asegurar que la importación CSV también persiste el código de estudiante (`student_code`) y los apellidos extraídos del archivo (no solo nombre y email).
- [x] UI de lista de alumnos con búsqueda y filtrado por módulo/programación.
- [x] El botón de "Seleccionar CSV de Moodle" que ponga "importar CSV". Que tenga al lado un botón redondito de "I" (de información), que muestre un tooltip con el formato esperado del CSV. Colocar estos dos botones arriba, antes de la fila de añadir nuevo alumno.
- [x] Mover el campo de "Buscar alumno..." entre la fila de añadir alumno y la tabla de alumnos, y a la izquierda en lugar de a la derecha.

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
- [ ] Exportar matriz completa de instrumentos en CSV: filas = alumnos, columnas = instrumentos + notas calculadas.
- [ ] Exportar acta de evaluacion: documento resumen con notas finales por alumno y estadisticas del grupo.

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

### Phase 3.7 - Futuro: Congelación de notas por trimestre (Opción B)

> **Nota:** Esta tarea es distinta de los nuevos toggles de cierre global de T1/T2/T3 en 3.6.4. Aquí se mantiene la idea de congelación histórica avanzada (versionado completo de pesos y auditoría).

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
- [x] Corregir tipado del Route Handler `import-grades` para Next 16 (`params` como `Promise`) y evitar fallo de `next build` en Vercel.

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

---

## Testing

> Estado actual: **0 tests unitarios** en `src/`. Solo hay tests de UI-quality con Playwright (`tests/ui-quality/`). El motor de notas (`grade-engine.ts`) es el componente más crítico y más complejo, y no tiene cobertura. El runner es **Vitest** (`npm test`), con entorno `jsdom`. Los tests van en `src/**/*.test.ts`.

### T1 — Motor de notas: cálculo de RA originales (`grade-engine.ts`)

- [ ] RA con un solo instrumento y un solo CE con peso 100%: la nota RA = nota instrumento.
- [ ] RA con dos instrumentos y dos CEs, pesos iguales: nota RA = media de los dos instrumentos.
- [ ] RA con dos CEs y pesos distintos (30/70): la ponderación es correcta.
- [ ] RA con CE sin nota de instrumento: `originalGrade = null`, `completionPercent < 100`.
- [ ] RA con todos los CEs sin nota: `originalGrade = null`, `completionPercent = 0`.
- [ ] RA con algún CE evaluado y otro no: `completionPercent` proporcional al número evaluado.
- [ ] Instrumento PRI/PMI **no** contribuye a `originalGrade`.
- [ ] Score específico por CE tiene precedencia sobre score genérico de instrumento (fallback).
- [ ] Instrumento activo en T1 no aparece en la nota de T2 (segregación trimestral).
- [ ] RA inactivo en T2 no forma parte de la nota trimestral T2.

### T2 — Motor de notas: lógica PRI/PMI (`buildPriPmiImpactsForRA`)

- [ ] Sin PRI/PMI para ese RA: `improvedAutoGrade = null`, `improvedGrade = originalGrade`.
- [ ] PRI/PMI con nota mayor que `originalGrade`: `isApplied = true`, `improvedAutoGrade = scoreValue`.
- [ ] PRI/PMI con nota igual a `originalGrade`: `isApplied = false`, no se aplica (no mejora).
- [ ] PRI/PMI con nota menor que `originalGrade`: `isApplied = false`, `improvedGrade = originalGrade`.
- [ ] Varios PRI/PMI para el mismo RA: se selecciona el de **mayor nota**, no el más reciente.
- [ ] Varios PRI/PMI, el mejor no mejora la original: ninguno se marca `isApplied`.
- [ ] Varios PRI/PMI, el mejor sí mejora: solo el primero (mayor) tiene `isApplied = true`.
- [ ] PRI/PMI sin nota registrada (score_value null): se ignora completamente.
- [ ] `originalGrade = null` (RA sin evaluar): cualquier PRI/PMI con nota se marca `isApplied = true` (mejora sobre null).

### T3 — Motor de notas: overrides manuales

- [ ] Override manual de RA: `improvedGrade = overrideValue`, `improvedIsManual = true`.
- [ ] Override manual de RA con valor menor que `improvedAutoGrade`: el override prevalece igualmente (regla de precedencia total).
- [ ] Sin override manual: `improvedIsManual = false`, `improvedGrade = improvedAutoGrade ?? originalGrade`.
- [ ] Override manual de nota final: `finalImprovedGrade = overrideValue`, `finalImprovedIsManual = true`.
- [ ] Sin override final: nota final calculada desde RAs mejorados ponderados.
- [ ] Override manual de nota final no afecta a `finalOriginalAutoGrade`.

### T4 — Motor de notas: notas trimestrales

- [ ] Nota trimestral autocalculada sin notas: `autoGrade = null`.
- [ ] Nota trimestral es media ponderada de RAs activos en ese trimestre con notas.
- [ ] Override ajustado de trimestre: `adjustedGrade = overrideValue`, `adjustedIsManual = true`.
- [ ] Sin override ajustado: `adjustedGrade = floor(autoGrade)`.
- [ ] `autoGrade = null` sin override: `adjustedGrade = null`.
- [ ] Trimestre cerrado con snapshot: `autoGrade` toma el valor del snapshot (no recalcula).
- [ ] Trimestre cerrado sin snapshot: `autoGrade` recalcula igualmente (caso defensivo).

### T5 — Motor de notas: nota final del módulo

- [ ] Nota final original basada en `originalGrade` de RAs ponderados.
- [ ] Nota final mejorada auto basada en `improvedGrade` de RAs ponderados.
- [ ] Con un RA sin nota y otro con nota: `finalOriginalHasMissingData = true`, grade parcial.
- [ ] Todos los RAs sin nota: `finalOriginalAutoGrade = null`.
- [ ] Pesos de RA suman 100%: la ponderación es correcta.
- [ ] Pesos de RA a 0 (o inexistentes): se hace media simple igual.
- [ ] Nota final mejorada manual prevalece sobre autocalculada.

### T6 — Motor de notas: estadísticas de grupo

- [ ] Sin alumnos calificados: `averageFinalGrade = null`, `medianFinalGrade = null`.
- [ ] Un solo alumno calificado: `averageFinalGrade = medianFinalGrade = stdDevFinalGrade = null`.
- [ ] Media con dos alumnos: valor correcto.
- [ ] Mediana con número impar de alumnos: elemento central.
- [ ] Mediana con número par de alumnos: media de los dos centrales.
- [ ] Desviación típica con valores iguales: `stdDev = 0`.

### T7 — Helpers de UI: parseo y formateo de notas (`GradesTab.tsx`)

- [ ] `parseGrade("")`: `ok = false`.
- [ ] `parseGrade("abc")`: `ok = false`.
- [ ] `parseGrade("5,5")`: `ok = true`, `value = 5.5` (coma como decimal).
- [ ] `parseGrade("-1")`: `ok = false` (fuera de rango).
- [ ] `parseGrade("10.5")`: `ok = false` (fuera de rango).
- [ ] `parseGrade("7.5")`: `ok = true`, `value = 7.5`.
- [ ] `parseGradeInteger("7.3")`: `ok = false` (decimal rechazado por validación explícita).  
       _Nota: en `saveTrimesterAdjusted` el decimal se trunca silenciosamente antes de llamar a esta función; el test debe verificar el helper puro por separado._
- [ ] `formatInputValue(null)`: devuelve `""`.
- [ ] `formatInputValue(7)`: devuelve `"7"` (sin decimales para enteros).
- [ ] `formatInputValue(7.5)`: devuelve `"7.5"`.

### T8 — Reglas de negocio de UI: validación de RA mejorada manual

- [ ] Valor ingresado >= `improvedAutoGrade`: se acepta y persiste como override.
- [ ] Valor ingresado < `improvedAutoGrade` (cuando hay PRI/PMI aplicado): se llama `resetRAImproved` (revertir).
- [ ] Valor ingresado < `originalGrade` (cuando no hay PRI/PMI): se llama `resetRAImproved`.
- [ ] Valor ingresado igual a `originalGrade` sin PRI/PMI: se acepta (es un override válido).

### T9 — Reglas de negocio de UI: truncado de nota trimestral ajustada

- [ ] Valor `7.9` ingresado: se guarda `7` (Math.floor silencioso).
- [ ] Valor `5.0` ingresado: se guarda `5`.
- [ ] Valor `10` ingresado: se guarda `10`.
- [ ] Valor `-1` ingresado: error de rango, no se guarda.
- [ ] Valor `11` ingresado: error de rango, no se guarda.
