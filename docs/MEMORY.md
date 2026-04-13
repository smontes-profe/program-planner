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

## Terminología del Dominio (FP — Formación Profesional)

- **Unidad de Trabajo (UT)** — término correcto en FP para lo que en ESO/Bachillerato se llama "Unidad Didáctica (UD)". Son equivalentes pedagógicamente, pero en FP **siempre se usa "Unidad de Trabajo"**. Nunca usar "Unidad Didáctica", "didactic unit" ni "UD" en UI, docs ni código.
  - Abreviatura correcta: **UT** (no UD)
  - Tabla de BD propuesta: `plan_teaching_unit` (no `plan_didactic_unit`)
- **RA** — Resultado de Aprendizaje (equivalente a "objetivo" en ESO/Bach)
- **CE / CCEE** — Criterio/Criterios de Evaluación
- **BOJA** — Boletín Oficial de la Junta de Andalucía (fuente legal de los currículos)
