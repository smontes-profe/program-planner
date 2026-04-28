# Program Planner - Task Backlog

Status legend:

- `[ ]` pending
- `[-]` in progress
- `[x]` done
- `[!]` blocked
- `[P0]` priority 0 (Highest priority. This should be done ASAP)
- `[P1]` priority 1 (High priority. This should be done soon)
- `[P2]` priority 2 (Medium priority. This should be done when possible)
- `[P3]` priority 3 (Low priority. This should be done when time permits)

(Old finished tasks can be found in TASKS_DONE.md)

## Phase 4 - Ongoing feedback and improvements

- [P0][x] Cambios en visibilidad de Programaciones y currículos: dejar solo opciones: "Privada" y "Organización". Los acurrículos y programaciones privados solo son visibles y utilizables por sus creadores.
- [P0][x] Los currículos y programaciones que tengan visibilidad "organización", y estén en estado de "Borrador" solo deben ser visibles y usables por sus dueños.
- [P0][x] BUG: Currículos: Visibilidad: el desplegable aun muestra "private"/"organization" (en inglés) al seleccionarse
- [P0][x] Currículos: Añadir los siguientes campos: -Título (por ej. "Técnico Superior en Desarrollo de Aplicaciones Web") -ID (por ej. "DAW") -Nivel (desplegable con las opciones "FP Básica", "Grado Medio", "Grado Superior", "Máster"), -Curso (Desplegable con "Primero", "Segundo", "NA").
- [P0][x] Currículos: En la "pastilla" de cada currículo, donde ahora mismo aparece ID_título - Código_Módulo - Fecha, que aparezca: ID_título - Curso (salvo si es NA, entonces no aparece curso) - Código_módulo - Fecha.
- [P0][x] Programaciones: En la "pastilla" de cada programación, donde ahora mismo aparece Código_Módulo - Fecha, que aparezca: ID_título - Curso (salvo si es NA, entonces no aparece curso) - Código_módulo - Fecha (del currículo asociado a la programación).

## Phase 6 - Collaboration and Visibility

- [P0][x] Programación: Que se pueda editar la visibilidad, el año académico, y el título.
- [P0][x] BUG: Los currículos y programaciones que tengan visibilidad "Organización" no aparecen para otros usuarios.
- [P0][x] Los currículos y programaciones que tengan visibilidad "Organización", solo son accesibles en modo "lectura" (como consulta) por aquellos que no sean sus creadores. Los currículos que no sean propios y estén visibles a nivel de organización se podrán usar de base para crear una programación nueva propia.
- [P1][x] Añadir una opción para "clonar" una programación de visibilidad "organización" para usarla como propia.
- [P1][x] Currículos: Que aparezca el nombre del usuario que creó el currículo.
- [P1][x] Currículos: Añadir un filtro para poder filtrar por nombre o dueño.
- [P1][x] Programaciones: Que aparezca el nombre del usuario que creó la programación y el currículo usado.
- [P1][x] Programaciones: Añadir un filtro para poder filtrar por nombre, dueño, currículo usado.
- [P2][x] Currículos: los bloques de cada currículo son muy grandes. Reducir tamaño, reducir también el tamaño del texto del nombre
- [P2][x] Currículos y programaciones: Cambiar la etiqueta de visibilidad "organización" o "Mi organización" por "Público".
- [P0][ ] Evaluaciones: Mismas reglas de visiblidad que para currículos y programaciones: hacer que una evaluaación pueda ser privada o pública. Que las privadas solo las pueda ver su propio usuario, que las públcias no propias se puedan ver y clonar. No editar..

### Phase 9 - Futuro: Congelación de notas por trimestre (Opción B)

> **Nota:** Esta tarea es distinta de los nuevos toggles de cierre global de T1/T2/T3 en 3.6.4. Aquí se mantiene la idea de congelación histórica avanzada (versionado completo de pesos y auditoría).

- [P3] [ ] Definir concepto de "trimestre cerrado": las notas calculadas de un trimestre se congelan y no se ven afectadas por cambios futuros de pesos.
- [P3] [ ] Mecanismo para que el profesor "cierre" un trimestre explícitamente.
- [P3] [ ] El motor de notas debe usar dos conjuntos de pesos:
  - Pesos vigentes al cierre del trimestre → para notas ya calculadas.
  - Pesos actuales → para trimestres abiertos y futuras entradas de notas.
- [P3] [ ] UI para mostrar qué pesos se usaron en cada trimestre y permitir revisar histórico.
- [P3] [ ] Auditoría de cambios de pesos con fecha y responsable.

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
