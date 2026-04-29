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

## Phase 9 - Ongoing feedback and improvements

- [P1][x] Currículos: Quitar el botón de archivar de la pastilla. hacer que toda la pastilla vuelva a ser clickable. Usar  el botón de "eliminar" que tenemos al lado del botón de "editar" dentro del currículo para archvar el currículo.
- [P1][x] Permitir archivar programaciones que no estén asociadas a ninguna evaluación (añadir un botón junto al de "Configuración") de la programación, y permitir archivar evaluaciones (añadir el botón, dentro de la evaluación, en la línea del nombre, a la derecha).
- [P0][x] Programaciones/Ras vs Instrumentos: Ahora mismo en la matriz solo aparecen los instrumentos que aportan algo a algún RA. Que aparezcan todos, aunque aun no aporten nada a ningún RA.
- [P3][x] Los filtros de listas de Currículos y programaciones dejarlos en dos líneas. Ahora mismo intentando ocupase cortan los textos, y el botón de filtrar igualmente está en la segunda línea. Repartir todo mejor.
- [P3][x] Pastillas de programaciones, currículos, evaluaciones: a veces, incluso truncando el nombre, no cabe bien y el indicador del estado (borrador/publicado) y el de público/privado, se salen de la pastilla. Que no ocurra eso. Que siempre estén alineados a la derecha, y truncar aun más caracteres del nombre si hace falta.
- [P0][x] Evaluaciones: Los campos ID, email deben ser únicos para los alumnos. Al insertar nuevo alumno, si ya existe algún alumno con mismo email o ID, que lance un mensaje de error y no permita insertarlo. 
- [P1][x] Evaluaciones: Eliminar el estado (borrador/publicada). Eliminar visibilidad Publica/privada. Que un usuario solo pueda ver sus propias evaluaciones. Eliminar el filtro del creador. Ajustar todos los elementos visuales acorde a todo esto. 
- [P2][x] Listas de currículos, programaciones: Añadir un desplegable "Ordenar por.." que permita ordenar por nombre ASC/DESC, fecha ASC/DESC.
- [P2][x] Evaluaciones: Si un trimestre está cerrado, no se pueden tocar las notas ajustadas de esos trimestres.
- [P3][ ] Programaciones: en la pastilla de cada programación, el indicador de "Publicada"/"Draft" cuando esté publciada, debería salir en verde (como para los currículos).
- [P3][ ] Evaluaciones: en la pastilla de cada evaluación, mover el creador en la misma fila de la fecha, un poco a su derecha (truncar el nombre del creador si se saliera de la pastilla). Recortar el tamaño vertical de las pastillas al no necesitar tanto ya. Al no tener estados (publicada, borrador), la franja horizontal, que salga verde en lugar de gris. 
- [P3][ ] Evaluaciones, PRIS/PMIS: Poner un tamaño máximo de casilla. Ahora mismo se autoajusta al ancho y cuando hay pocos (2 o 3 sueles er lo normal), queda gigantesco.


## Phase 10 - Cambio de normativa: 2 evaluaciones por año en lugar de 3

- [P0][ ] Cambiamos el concepto de "Trimestre" por "Evaluación". Documentamos cada cambio que se va a hacer en estas tareas, porque son importantes.
- [P0][ ] Al crear una programación, dar a elegir si la programación constará de 3 periodos de evaluación (plan antiguo, por trimestres), o 2 (plan nuevo, con primera evaluación y segunda evaluación).
- [P0][ ] Reflejar esos periodos en las pantallas de "Pesos": en lugar de T1, T2, T3, mostrar EV1, EV2, EV3 (o EV1 y EV2 si es plan nuevo), Unidades de Trabajo (Trimestre por evaluaciones y 2 o 3 columnas).
- [P0][ ] Las evaluaciones "heredan" el número de evaluaciones de su programación. Si la programación tiene 2 evaluaciones, la evaluación tendrá 2 evaluaciones. Si la programación tiene 3 evaluaciones, la evaluación tendrá 3 evaluaciones. Reflejar esto en las pantallas de "Matriz de notas" (en el filtro), en las notas calculadas (tanto en el filtro como en las columnas), y en las exportaciones (NOtas trimestrales pasa a ser "NOtas por evaluaciones" y reflejaría las evaluaciones correspondientes, ya sean 2 o 3).
- [P0][ ] Evaluaciones: Cambio adicional en las notas calculadas: en el caso de tener la normativa nueva (2 evaluaciones), en la matriz de  notas calculadas, en la columna "FInal", tendremos la "Auto", la ajustada pasaría a llamarse "Final 1" (funcionaría igual que ahora), y tendríamos otra nueva columna "Final 2". De partida, tendrá el mismo funcionamiento que la ajustada (ahora  "final 1").

## Phase 11 - Continuar con los Tests.
- [P2][ ] Revisar y actualizar el estado de los tests.
- [P3][ ] Elaborar los tests pendientes. Ir marcando los que se vayan completando.

## Phase 12 - Exportar programación

- [P1][ ] Buscar una manera de poder exportar un pdf o un docx con un formato igual al de los documentos de programación que se encuentran en la carpeta `docs/templates`. Inicialmente, solo con el contenido de la programación (sin las evaluaciones).
- [P2][ ] Añadir la posibilidad de añadir los bloques adicionales "tipo" a la exportación, de acuerdo también a los templates.



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
