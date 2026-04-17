## Memory

This doc is to be used as a persistent "memory" for AI agents working on this project. It should be updated regularly with any important information that the AI agents should remember about the project (like important notes and changes written by human developers).

## Important Notes

- **Certeza**: Cuando des alguna respuesta sobre la que no estés seguro al 100% (ya sea de código, solución a un problema, lo que sea...), avisa de ello, a ser posible dando un porcentaje de fiabilidad.
- **Honestidad**: Salvo que se especifique lo contrario, sé honesto. Evita "hacer la pelota". Si crees que algo está bien, regular, mal, excelente... dilo.
- **Comunicación de Cambios:** Antes de realizar cualquier modificación importante en los archivos, el agente debe explicar detalladamente el plan de acción al usuario y esperar su visto bueno.
- **Revisión y Feedback:** Tras completar una tarea o bloque de tareas, el agente debe esperar a que el usuario revise los cambios realizados y le proporcione feedback antes de continuar.
- **Documentación tras cambios importantes:** Al recibir una solicitud relevante se debe identificar qué archivos dentro de `docs/` (como mínimo `SPECS.md`, `ARCHITECTURE.md`, `TASKS.md`, `MEMORY.md`, y cualquier otro afectado) requieren actualización antes de comenzar y actualizarlos junto a la implementación una vez el plan esté aprobado.
- **Comunicación en español:** Todas las conversaciones con desarrolladores humanos dentro de este chat deben llevarse a cabo en español de España.
- **Seguir los prompts:** Cuando un desarrollador pide te pide una cosa explícitamente, aunque se qhaya quedado otra pendiente o con errores, haz exactamente lo que pide y no insistas en corregir el fallo o lo pendiente (salvo que se alcare explícitamente).
- **Fiabilidad:** Antes de dar un problema como solucionado, el agente debe verificar que realmente lo está y que no hay errores o fallos, dentroo de sus posibilidades , siempre que no lleve un tiempo desmesurado.Especialmente si ya van más de un intento. En caso de duda, es mejor pecar de precavido y pedir ayuda al usuario. Además, asegurarse siempre de que la solución no ha roto algo que ya funcionaba.
- **Aplicar migraciones con MCP/CLI:** Cada vez que se creen nuevas migraciones SQL en `supabase/migrations/`, ejecutarlas inmediatamente contra la base de datos de Supabase. No dejar migraciones pendientes sin aplicar.
  - **MCP (`mcp__supabase-postgres__query`)**: solo lectura — NO sirve para `CREATE TABLE`, `ALTER TABLE`, etc.
  - **Supabase CLI (`supabase db push`)**: funciona si el historial de migraciones está sincronizado. Si hay desajustes, fallará.
  - **psql (fallback fiable)**: ejecutar directamente la migración con `psql` usando la URL del **Supabase Pooler** (puerto 5432), que **sí permite escritura**: `psql "postgresql://postgres.rjqdebeaupjvdmjtsdws:ITheLarch1975$@aws-1-eu-west-1.pooler.supabase.com:5432/postgres" -f supabase/migrations/NOMBRE.sql`. Después marcar como aplicada con `supabase migration repair VERSION --status applied`.
- **Migraciones Súper Proactivas:** A partir de ahora, siempre que el agente genere una nueva migración en `supabase/migrations/` debe aplicarla él mismo contra Supabase (preferiblemente con `supabase db push`, o con `psql` usando la URL del pooler) y confirmar que el esquema queda actualizado; no se debe dejar depender a un desarrollador humano para ese paso.
- **Feedback persistente:** El currículum debe mostrar RA y CE truncados (igual que hacemos en la sección de programaciones). Todos los `Number` steppers deben avanzar de 1 en 1. Los mensajes de error deben ser claros y en castellano. En la pantalla de instrumentos reducir el espacio para tipo/UT/RA, truncar nombres largos (con tooltip) y dejar más espacio para los CEs. Guarda esta nota para futuros agentes.

## Terminología del Dominio (FP — Formación Profesional)

- **Unidad de Trabajo (UT)** — término correcto en FP para lo que en ESO/Bachillerato se llama "Unidad Didáctica (UD)". Son equivalentes pedagógicamente, pero en FP **siempre se usa "Unidad de Trabajo"**. Nunca usar "Unidad Didáctica", "didactic unit" ni "UD" en UI, docs ni código.
  - Abreviatura correcta: **UT** (no UD)
  - Tabla de BD propuesta: `plan_teaching_unit` (no `plan_didactic_unit`)
- **RA** — Resultado de Aprendizaje (equivalente a "objetivo" en ESO/Bach)
- **CE / CCEE** — Criterio/Criterios de Evaluación
- **BOJA** — Boletín Oficial de la Junta de Andalucía (fuente legal de los currículos)
- **Acceso critico (abril 2026):** El alta directa por signup queda deshabilitada. El flujo correcto es Solicitar acceso + revision en panel /admin por platform_admin. Mantener esta restriccion por sensibilidad de datos de alumnado.
- **Aprobación de solicitudes (abril 2026):** En `/admin`, el campo de contraseña al aprobar una solicitud es opcional para reemplazo. Si se deja vacío, se mantiene la contraseña solicitada originalmente por el usuario; si se rellena, se usa la nueva. Las contraseñas solicitadas se guardan cifradas en servidor (no hash irreversible) hasta resolver la solicitud.
- **PRI/PMI (abril 2026):** En la app se tratan como el mismo tipo (checkbox unico). Son instrumentos especiales individuales: se configuran por RA (sin pesos RA/CE), no aparecen en la matriz normal y van en su propia sección `PRIS/PMIS`.
- **Regla de cálculo PRI/PMI (rev. abril 2026):** Para RA mejorada, si no hay override manual: se toma el PRI/PMI con la **mejor nota** (mayor score) y solo se aplica si esa nota supera estrictamente la original autocalculada. Si ningún PRI/PMI mejora la original, `improvedAutoGrade = null` e `improvedGrade = originalGrade`. Si existe override manual, manda siempre el valor manual.
- **Notas finales y trimestres (abril 2026):** La nota final autocalculada debe basarse en RAs/pesos (no en medias trimestrales). Habrá dos columnas de final (original y mejorada), con posibilidad de override manual en mejorada. Los toggles de cierre trimestral son globales y congelan solo autocalculadas; las ajustadas siguen editables a mano.
- **Reset de overrides manuales (abril 2026):** Los iconos ✏️ de las columnas "Ajustada" (trimestres) y "Mejorada" (RA y Final) son botones clickables que eliminan el override manual de la BD y revierten el estado al valor autocalculado. Server Actions: `deleteTrimesterAdjustedOverride`, `deleteRAManualOverride`, `deleteFinalManualOverride` en `src/domain/evaluation/actions.ts`. Al resetear RA mejorada, se usa `ra.improvedAutoGrade` (campo siempre disponible en `StudentRAGradeSummary`); al resetear final mejorada, se usa `student.finalImprovedAutoGrade`.
- **Gotcha PostgREST FK ambigüedad (abril 2026):** Si dos tablas tienen FK a la misma tabla padre y también tienen columna `student_id` o nombre similar, PostgREST no puede resolver el embed implícito `tabla(count)`. Usar sintaxis `tabla!nombre_constraint(count)` para desambiguar. Caso concreto: `evaluation_students!evaluation_students_context_id_fkey(count)` en `listEvaluationContexts` — causado porque `instrument_student_scores` también tiene FK a `evaluation_contexts`.
- **Tabla notas calculadas — UX (abril 2026):** Celdas numéricas usan `px-1.5 py-2` (no `px-3`). Inputs de override: `h-7 w-[52px] step=0.01`. Min-width: tabla trimestres 820px, tabla RA 600px. Los step deben ser `0.01` para permitir decimales en overrides manuales.
