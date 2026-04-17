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

## Phase 3.7 - Evaluaciones: Mejoras pendientes

- [x] Matriz de notas: Añadir selectores justo antes de la tabla (después del texto de explicación de imprtar csv), para poder marcar T1, T2, T3. Por defecto, deben estar marcados todos los trimestres. Si se modifican, la tabla debe mostrar solo las notas de los instrumentos correspondientes a los trimestres marcados.
- [x] Matriz de notas: Validación de CSV con preservación de datos en caso de error y reporte de errores por fila/columna.
- [] Matriz de notas: cuando hay scroll horizontal no se aprecia bien si estás en la parte de arriba de la tabla.
- [ ] Exportación de notas: Permitir exportar notas por trimestre.
- [ ] Exportación de notas: Exportar acta de evaluacion: documento resumen con notas finales por alumno y estadisticas del grupo.

## Phase 4 - Collaboration and Visibility

- [ ] Implement deep import/fork from template.
- [ ] Implement deep import/fork from published plan.
- [ ] Persist lineage (`source_*`, `imported_at`).
- [ ] Implement visibility-based read/import policy:
  - `private`
  - `organization`
  - `company`
- [ ] Ensure no automatic source sync after import.

## Phase 6 - Evaluation Engine

- [ ] Add unit tests for formulas and edge cases.

## Phase 8 - CI/CD and Release

- [ ] GitHub Actions: lint + typecheck + test on PR.
- [ ] Branch strategy: `develop` -> development deploy, `main` -> production deploy.
- [x] Configure GitHub secrets (`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`).
- [x] Vercel environment segregation.
- [x] Corregir tipado del Route Handler `import-grades` para Next 16 (`params` como `Promise`) y evitar fallo de `next build` en Vercel.

## Phase 8.1 - UX Quality Gates

- [x] Add automated accessibility checks in CI scaffold for critical pages/components.
- [x] Add responsive visual checks in CI scaffold for key breakpoints.
- [ ] Define release gate for unresolved accessibility blockers.

## Phase 8.2 - Mobile Progression

- [ ] Define mobile-read and mobile-light-edit acceptance criteria.
- [ ] Instrument analytics for mobile friction in core flows.
- [ ] Prioritize and execute high-impact mobile improvements.

### Phase 9 - Futuro: Congelación de notas por trimestre (Opción B)

> **Nota:** Esta tarea es distinta de los nuevos toggles de cierre global de T1/T2/T3 en 3.6.4. Aquí se mantiene la idea de congelación histórica avanzada (versionado completo de pesos y auditoría).

- [ ] Definir concepto de "trimestre cerrado": las notas calculadas de un trimestre se congelan y no se ven afectadas por cambios futuros de pesos.
- [ ] Mecanismo para que el profesor "cierre" un trimestre explícitamente.
- [ ] El motor de notas debe usar dos conjuntos de pesos:
  - Pesos vigentes al cierre del trimestre → para notas ya calculadas.
  - Pesos actuales → para trimestres abiertos y futuras entradas de notas.
- [ ] UI para mostrar qué pesos se usaron en cada trimestre y permitir revisar histórico.
- [ ] Auditoría de cambios de pesos con fecha y responsable.

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
