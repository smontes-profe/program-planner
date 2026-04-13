# Program Planner - Business Specifications

## 1. Product Scope

Program Planner is a web platform for FP teachers to design, evaluate, and share didactic planning for one or more modules across multiple organizations and autonomous communities.

Primary goals:

- Support multi-region curricula (same module, different region rules).
- Support academic-year versioning (format `YYYY/YYYY+1`, for example `2026/2027`).
- Provide traceability from `RA -> CE -> UT -> Instrument -> Grade`.
- Guarantee legal and pedagogical consistency with strict weight validation.
- Enable internal collaboration with safe cloning and lineage tracking.
- Deliver a responsive and accessible web experience for daily teacher workflows.

## 2. Locked Decisions (Confirmed on 2026-03-24)

These decisions are mandatory for implementation unless explicitly replaced in a later revision.

- `D1`: single PostgreSQL database with `organizations` and `organization_memberships`.
- `D2`: every teaching plan belongs to both `organization_id` and `owner_profile_id`.
- `D3`: visibility model is `private | organization | company` (no public internet in MVP).
- `D4`: role model is `platform_admin | org_manager | teacher`.
- `D5`: curriculum template versioning key is `region_code + module_code + academic_year + version`; published versions are immutable.
- `D6`: import/fork is deep copy with lineage metadata and no automatic sync with source.
- `D7`: authorization is enforced with Supabase RLS (not application-only checks).
- `D8`: normalized `academic_year` and controlled `region_code` catalog are required.

## 3. Identity, Organization, and Role Model

### 3.1 Profiles and Membership

- A user has one profile and can belong to multiple organizations.
- Membership relation includes:
  - `organization_id`
  - `profile_id`
  - `role_in_org` (initially `org_manager` or `teacher`)
  - activation status

### 3.2 Role Semantics

- `teacher`: manage own planning data inside organizations where they are member.
- `org_manager`: all teacher capabilities + manage organization users and shared assets in their organization.
- `platform_admin`: global access and moderation across all organizations.

## 4. Core Domain Model

### 4.1 Curriculum Template

Reusable curriculum content indexed by region/module/year/version.

Core fields:

- `organization_id` (owner organization of the template record)
- `region_code`
- `module_code`
- `module_name`
- `academic_year`
- `version` (`v1`, `v2`, ...)
- `status` (`draft`, `published`, `deprecated`)

Business rules:

- Only `published` templates can be imported.
- A `published` template is immutable; updates require creating a new version.

### Añadiendo RRAA en bloque:

El usuario podrá copiar y pegar todos los RRAA (y sus criterios de evaluación) de un módulo de una sola vez. El sistema debe identificar cuando hay un patrón típico de nombre de RRAA (ej. "1. ", "2. ", "3. ", etc.) y separar usando esos patrones, usar el patrón ("1", "2", "3") como código del RRAA y luego el texto siguiente como la descripción. Por ejemplo, si pego "1. Se han caracterizado y diferenciado los modelos de ejecución de código en el servidor y en el cliente web. 2. Se han identificado las capacidades y mecanismos de ejecución de código de los navegadores web." debería crear dos RRAAs, uno con código "1" y descripción "Se han caracterizado y diferenciado los modelos de ejecución de código en el servidor y en el cliente web." y otro con código "2" y descripción "Se han identificado las capacidades y mecanismos de ejecución de código de los navegadores web.".
Luego, dentro del bloque de cada RA, debe inditifcar los patrones para separar también los criterios de evaluación.
Ejemplo:
-----comienzo del ejemplo-----
1. Selecciona las arquitecturas y tecnologías de programación sobre clientes web, identificando y analizando las capacidades y características de cada una.

Criterios de evaluación:

a) Se han caracterizado y diferenciado los modelos de ejecución de código en el servidor y en el cliente web.

b) Se han identificado las capacidades y mecanismos de ejecución de código de los navegadores web.

c) Se han identificado y caracterizado los principales lenguajes relacionados con la programación de clientes web.

d) Se han reconocido las particularidades de la programación de guiones y sus ventajas y desventajas sobre la programación tradicional.

e) Se han verificado los mecanismos de integración de los lenguajes de marcas con los lenguajes de programación de clientes web.

f) Se han reconocido y evaluado las herramientas de programación y prueba sobre clientes web.

2. Escribe sentencias simples, aplicando la sintaxis del lenguaje y verificando su ejecución sobre navegadores web.

Criterios de evaluación:

a) Se ha seleccionado un lenguaje de programación de clientes web en función de sus posibilidades.

b) Se han utilizado los distintos tipos de variables y operadores disponibles en el lenguaje.

c) Se han identificado los ámbitos de utilización de las variables.

d) Se han reconocido y comprobado las peculiaridades del lenguaje respecto a las conversiones entre distintos tipos de datos.

e) Se han utilizado mecanismos de decisión en la creación de bloques de sentencias.

f) Se han utilizado bucles y se ha verificado su funcionamiento.

g) Se han añadido comentarios al código.

h) Se han utilizado herramientas y entornos para facilitar la programación, prueba y documentación del código.

-----fin del ejemplo-----
Esto se graduciría en:
RA 1:

- Código: 1
- Descripción: Selecciona las arquitecturas y tecnologías de programación sobre clientes web, identificando y analizando las capacidades y características de cada una.
- Criterios de Evaluación:
  -Criterio 1:
  -Código: a
  -Descripción: Se han caracterizado y diferenciado los modelos de ejecución de código en el servidor y en el cliente web.
  -Criterio 2:
  -Código: b
  -Descripción: Se han identificado las capacidades y mecanismos de ejecución de código de los navegadores web.
  -Criterio 3:
  -Código: c
  -Descripción: Se han identificado y caracterizado los principales lenguajes relacionados con la programación de clientes web.
  -Criterio 4:
  -Código: d
  -Descripción: Se han reconocido las particularidades de la programación de guiones y sus ventajas y desventajas sobre la programación tradicional.
  -Criterio 5:
  -Código: e
  -Descripción: Se han verificado los mecanismos de integración de los lenguajes de marcas con los lenguajes de programación de clientes web.
  -Criterio 6:
  -Código: f
  -Descripción: Se han reconocido y evaluado las herramientas de programación y prueba sobre clientes web.
  RA 2:
- Código: 2
- Descripción: Escribe sentencias simples, aplicando la sintaxis del lenguaje y verificando su ejecución sobre navegadores web.
- Criterios de Evaluación:
  -Criterio 1:
  -Código: a
  -Descripción: Se ha seleccionado un lenguaje de programación de clientes web en función de sus posibilidades.
  -Criterio 2:
  -Código: b
  -Descripción: Se han utilizado los distintos tipos de variables y operadores disponibles en el lenguaje.
  -Criterio 3:
  -Código: c
  -Descripción: Se han identificado los ámbitos de utilización de las variables.
  -Criterio 4:
  -Código: d
  -Descripción: Se han reconocido y comprobado las peculiaridades del lenguaje respecto a las conversiones entre distintos tipos de datos.
  -Criterio 5:
  -Código: e
  -Descripción: Se han utilizado mecanismos de decisión en la creación de bloques de sentencias.
  -Criterio 6:
  -Código: f
  -Descripción: Se han utilizado bucles y se ha verificado su funcionamiento.
  -Criterio 7:
  -Código: g
  -Descripción: Se han añadido comentarios al código.
  -Criterio 8:
  -Código: h
  -Descripción: Se han utilizado herramientas y entornos para facilitar la programación, prueba y documentación del código.

### 4.2 Teaching Plan

Teacher-owned working copy used for real planning and grading.

Core fields:

- `organization_id`
- `owner_profile_id`
- `visibility_scope` (`private`, `organization`, `company`)
- `status` (`draft`, `published`)
- optional lineage (`source_template_id`, `source_plan_id`, `source_version`)

Business rules:

- Plan mutation only affects the current plan copy.
- Import/fork creates a fully independent graph of entities.
- `draft`: plan is being edited. Not visible from the Evaluations module.
- `published`: plan is available as a base for Evaluations. Can still be edited without reverting to `draft`.
- Status transitions: `draft ↔ published` (bidirectional, no intermediate states).
- Editing a `published` plan does NOT change its status; weight changes recalculate all existing grades immediately.

### 4.3 Planning Entities

- `RA` belongs to a teaching plan.
- `CE` belongs to an RA.
- `UT` belongs to a teaching plan.
- `UT <-> CE` is many-to-many.
- Each `UT` is assigned to one trimester (`T1`, `T2`, `T3`).

### 4.4 Evaluation Entities

- `EvaluationInstrument` belongs to a teaching plan.
- Instrument types include `exam`, `project`, `activity`, `form`, `teacher_notebook`, `custom`.
  - Instrument coverage is modeled per CE (`coverage_percent`).
  - Grade input supports:
    - `simple` mode: one grade replicated to all linked CE.
    - `advanced` mode: grade per CE.

### 4.4.1 Instrument RA/CE coverage anatomy

Each instrument defines both the set of RAs it touches and, for each RA, the percent of that RA’s grade that the instrument occupies. Within each RA, the instrument also records a CE-level share percentage so we can resolve how the instrument score flows from RA → CE. The CE share percentages for a given RA must sum to `100`; they represent the distribution of the instrument’s RA contribution across the RA’s criteria. When graders enter scores on an instrument, the `coverage_percent` stored for each CE is computed as the RA percentage multiplied by the CE share (both normalized) so that, for example, an instrument covering RA1 at `20%` with CE shares `a=20%`, `b=30%`, `c=50%` yields CE coverage of `4%`, `6%`, and `10%` of RA1, respectively. This explicit instrumentation makes it possible to trace any instrument grade back to the RA and CE(s) it supports.

## 5. Weight and Consistency Rules

All percentages are stored in `[0, 100]` decimal format.

### 5.1 Instrument RA coverage and automated CE weight distributions

Each evaluation instrument now records two layers of percentages: the share of each RA that it covers, and the share of each RA’s grade that is distributed among its CEs. The CE share percentages for a given RA must sum to `100`, because they describe how the instrument’s RA coverage is split across the CE’s within that RA. The RA percentage (for example, `20%` on RA1) represents how much of RA1 the instrument is responsible for, and the CE shares split that `20%` among the related criteria (for example, CE `a` gets `20%` of that `20%`, CE `b` gets `30%`, CE `c` gets `50%`, resulting in 4%, 6% and 10% of the RA, respectively).

A new “Automatizar pesos de CEs” option in the Pesos tab allows teachers to define a single RA → CE distribution per RA. When this option is enabled and every RA’s CE percentages sum to `100`, instrument editing no longer exposes manual CE share inputs for those RAs: instruments inherit their RAs’ CE distributions, and the CE coverage is computed automatically whenever an instrument is saved or graded. The Pesos editor should mirror the rest of the UI by letting teachers expand each RA to see its CEs and type the CE percentage to 2 decimals. This automation keeps per-instrument forms lean while ensuring consistent CE weights across all instruments that touch the same RA. If the automation is disabled or the CE percentages for an RA don’t pass validation, instruments must require manual CE share input per RA again.

Hard invariants:

1. For each teaching plan, sum of `RA.weight_in_plan` MUST equal `100`.
2. For each RA, sum of child `CE.weight_in_ra` MUST equal `100`.
3. Invariant violations produce **warnings** (not blocks): the plan can still be published and used in Evaluations even if weights do not sum to 100%.
4. The UI must display a warnings panel showing:
   - RAs whose `weight_global` does not sum to 100%.
   - Instruments without RA weight definitions.
   - CEs without weight definitions within an RA.

Soft invariants:

1. For each CE, sum of instrument coverage SHOULD equal `100` while drafting.
2. For final grade and publish readiness, CE coverage MUST be `100`.

Rounding policy:

- Internal calculations use decimal precision with at least 4 decimals.
- UI displays max 2 decimals.
- Final displayed grade rounds half-up to 2 decimals.

## 6. Grade Engine

### 6.1 Formula Definitions

- `instrument_ce_coverage_factor = instrument_ra_percent_normalized * ce_share_percent_normalized`
- `ce_grade = sum(instrument_grade_for_ce * instrument_ce_coverage_factor)`
- `ra_grade = sum(ce_grade * ce_weight_in_ra_normalized)`
- `final_grade = sum(ra_grade * ra_weight_in_plan_normalized)`

### 6.2 Missing Data Behavior

- If a CE has no graded instrument, CE grade is `null` (not zero).
- RA/final values are computed as partial aggregates and include completion metadata.
- UI must present both:
  - `computed_partial_grade`
  - `grade_completion_percent`

## 7. Trimester Logic

Trimester assignment derives from UT.

Derived outputs per trimester:

- active UT list
- active CE list
- active RA list
- CE/RA/UT/instrument coverage summaries

Business rule:

- CE may appear in multiple trimesters if covered by UT assigned to different trimesters.

## 8. Visibility and Collaboration

Visibility scopes:

- `private`: only owner, org managers of same organization, and platform admins.
- `organization`: any member in the same organization can read/import.
- `company`: any authenticated member of any organization can read/import.

Import/fork behavior:

- Deep copy related entities (`RA`, `CE`, `UT`, mappings, instruments if selected).
- Persist lineage metadata:
  - `source_plan_id`
  - `source_template_id`
  - `source_version`
  - `imported_at`
- No automatic synchronization after import.

## 9. Multi-Region and Versioning

- `academic_year` must follow normalized format (for example `2026/2027`).
- `region_code` must be from controlled catalog.
- Template uniqueness key:
  - `organization_id`
  - `region_code`
  - `module_code`
  - `academic_year`
  - `version`
- `published` records are immutable; replacement uses next version.

## 10. Curriculum Input Modes

- `manual`: required for MVP.
- `pdf_assisted`: optional post-MVP, teacher-reviewed before save.

Non-negotiable rule:

- AI extraction never auto-publishes; explicit teacher confirmation is required.

## 11. Technical Constraints

- Type-safe contracts with TypeScript.
- Zod validation at all write boundaries.
- PostgreSQL constraints, foreign keys, and safe cascades.
- Supabase RLS as primary authorization layer.
- Unit tests required for weight and grade engine logic.

## 12. UX, Accessibility, and Responsive Requirements

Baseline UX requirements:

- Core tasks must be clear, with predictable navigation and explicit feedback states.
- Forms must provide field-level and global error messages.
- Destructive actions must require confirmation.

Accessibility requirements:

- Target WCAG 2.2 AA for core flows (`auth`, `plan editing`, `grading`, `import/fork`).
- Full keyboard operability for all interactive controls.
- Visible focus states and semantic landmarks.
- Color contrast minimum:
  - normal text: `4.5:1`
  - large text: `3:1`
- Screen-reader compatible labels for form controls and icon-only buttons.

Responsive requirements:

- MVP must support desktop and tablet as first-class layouts.
- Mobile support in MVP must be usable for read and light edit workflows.
- Complex editing on mobile is allowed to be progressively improved after MVP.
- Responsive behavior must be verified at least in `320px`, `768px`, and `1280px` widths.

## 13. Mobile Feasibility Strategy

- Track real usage and friction in mobile sessions after first production rollout.
- Prioritize mobile improvements based on:
  - frequency of failed/abandoned actions
  - support requests
  - impact on critical flows
- Reassess full mobile parity after stabilization of core desktop/tablet workflows.

## 14. Definition of Done for Domain Features

A domain feature is complete only if all are true:

1. Behavior matches this specification.
2. Validation and error states are covered.
3. Tests pass.
4. Responsive and accessibility acceptance checks pass for affected UI.
5. `SPECS.md`, `ARCHITECTURE.md`, `TASKS.md`, and relevant diagrams are updated.
