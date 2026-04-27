# Program Planner - System Architecture

## 1. Architectural Style

- Framework: Next.js App Router (server-first).
- Backend pattern: Server Actions + Supabase client.
- Data store: PostgreSQL (Supabase) with strict relational integrity.
- AuthN/AuthZ: Supabase Auth + Row Level Security (RLS).
- Security strategy: database-enforced authorization, app checks as secondary layer.

## 2. Logical Modules

- `auth`: sign-in, password recovery, password update, and admin-managed account provisioning.
- `organization`: organization and membership management.
- `curriculum`: versioned curriculum templates by region/module/year.
- `teaching-plan`: teacher-owned planning graph.
- `evaluation`: evaluation contexts, student management, standard instrument grade entry, PRI/PMI grade entry, grade computation engine (original/improved/manual), and CSV import/export of students and grades.
- `collaboration`: import/fork and lineage.
- `admin`: cross-organization moderation, access request review, and platform role management.
- `ui-system`: design tokens, responsive layout primitives, accessibility patterns.

## 3. Context Diagram

```mermaid
flowchart LR
    Teacher[Teacher] --> App[Program Planner Web App]
    OrgManager[Organization Manager] --> App
    PlatformAdmin[Platform Admin] --> App
    App --> SupabaseAuth[Supabase Auth]
    App --> DB[(PostgreSQL - Supabase)]
    App --> Storage[(Supabase Storage)]
    GitHub[GitHub Actions] --> Vercel[Vercel]
    Vercel --> App
```

## 4. Data Model (ERD)

```mermaid
erDiagram
    PROFILE ||--o{ ORGANIZATION_MEMBERSHIP : has
    ORGANIZATION ||--o{ ORGANIZATION_MEMBERSHIP : contains

    ORGANIZATION ||--o{ CURRICULUM_TEMPLATE : owns
    CURRICULUM_TEMPLATE ||--o{ TEMPLATE_RA : contains
    TEMPLATE_RA ||--o{ TEMPLATE_CE : contains

    ORGANIZATION ||--o{ TEACHING_PLAN : contains
    PROFILE ||--o{ TEACHING_PLAN : owns

    TEACHING_PLAN ||--o{ PLAN_RA : contains
    PLAN_RA ||--o{ PLAN_CE : contains

    TEACHING_PLAN ||--o{ TEACHING_UNIT : includes
    TEACHING_UNIT }o--o{ PLAN_RA : covers
    TEACHING_UNIT ||--o{ PLAN_INSTRUMENT : evaluated_by

    TEACHING_PLAN ||--o{ EVALUATION_INSTRUMENT : defines
    EVALUATION_INSTRUMENT ||--o{ INSTRUMENT_CE_WEIGHT : maps
    PLAN_CE ||--o{ INSTRUMENT_CE_WEIGHT : weighted_by

    EVALUATION_INSTRUMENT ||--o{ INSTRUMENT_SCORE : records
    PLAN_CE ||--o{ INSTRUMENT_SCORE : graded_for

    TEACHING_PLAN }o--|| TEACHING_PLAN : cloned_from
    TEACHING_PLAN }o--|| CURRICULUM_TEMPLATE : imported_from

    PROFILE {
        uuid id PK
        string auth_user_id UNIQUE
        string email UNIQUE
        boolean is_platform_admin
        string full_name
        timestamptz created_at
    }

    ORGANIZATION {
        uuid id PK
        string code
        string name
        boolean is_active
        timestamptz created_at
    }

    ORGANIZATION_MEMBERSHIP {
        uuid id PK
        uuid organization_id FK
        uuid profile_id FK
        string role_in_org "org_manager|teacher"
        boolean is_active
        timestamptz created_at
    }

    CURRICULUM_TEMPLATE {
        uuid id PK
        uuid organization_id FK
        uuid created_by_profile_id FK
        string region_code
        string module_code
        string module_name
        string academic_year
        string version
        string status "draft|published|deprecated"
        string source_type "manual|pdf_assisted"
        int hours_total
        timestamptz created_at
    }

    TEMPLATE_RA {
        uuid id PK
        uuid template_id FK
        string code
        text description
    }

    TEMPLATE_CE {
        uuid id PK
        uuid template_ra_id FK
        string code
        text description
    }

    TEACHING_PLAN {
        uuid id PK
        uuid organization_id FK
        uuid owner_profile_id FK
        uuid source_plan_id FK
        uuid source_template_id FK
        string source_version
        string title
        string region_code
        string module_code
        string academic_year
        string visibility_scope "private|organization|company"
        string status "draft|published"
        timestamptz imported_at
        timestamptz created_at
    }

    PLAN_RA {
        uuid id PK
        uuid plan_id FK
        string code
        text description
        numeric weight_global
        boolean active_t1
        boolean active_t2
        boolean active_t3
    }

    PLAN_CE {
        uuid id PK
        uuid plan_ra_id FK
        string code
        text description
        numeric weight_in_ra
    }

    TEACHING_UNIT {
        uuid id PK
        uuid plan_id FK
        string code
        string title
        string trimester "T1|T2|T3"
        int hours
        int order_index
    }

    PLAN_INSTRUMENT {
        uuid id PK
        uuid plan_id FK
        string type "exam|practice|project|oral|other"
        boolean ce_weight_auto
        string name
        text description
        timestamptz created_at
    }

    PLAN_INSTRUMENT_CE {
        uuid instrument_id FK
        uuid plan_ce_id FK
        numeric weight
    }

    PLAN_UNIT_RA {
        uuid unit_id FK
        uuid plan_ra_id FK
    }

    PLAN_INSTRUMENT_UNIT {
        uuid instrument_id FK
        uuid unit_id FK
    }

    INSTRUMENT_RA_COVERAGE {
        uuid instrument_id FK
        uuid plan_ra_id FK
        numeric coverage_percent
    }

    EVALUATION_INSTRUMENT {
        uuid id PK
        uuid plan_id FK
        string type
        string title
        text description
        string grading_mode "simple|advanced"
        timestamptz created_at
    }

    INSTRUMENT_CE_WEIGHT {
        uuid id PK
        uuid instrument_id FK
        uuid plan_ce_id FK
        numeric coverage_percent
    }

    INSTRUMENT_SCORE {
        uuid id PK
        uuid instrument_id FK
        uuid plan_ce_id FK
        numeric score_value
        date score_date
        text notes
    }
```

### 4.1 Planned Evaluation Extension (PRI/PMI + manual overrides)

Target schema additions for the upcoming evaluation upgrade:

- `evaluation_instruments`
  - `is_pri_pmi boolean not null default false`
  - `recovery_effect_mode text not null default 'replace_ra_grade'`
- `instrument_ra_coverage`
  - For standard instruments: keeps `%` coverage behavior.
  - For PRI/PMI instruments: stores affected RAs with no percentage semantics.
- `instrument_student_scores`
  - Used for both standard instruments and PRI/PMI.
  - For PRI/PMI, empty score means non-participating student.
- New manual override storage:
  - `evaluation_ra_manual_overrides` (context_id, student_id, ra_id, improved_manual_grade, updated_by, updated_at)
  - `evaluation_trimester_adjusted_overrides` (context_id, student_id, trimester_key, adjusted_grade, updated_by, updated_at)
  - `evaluation_final_manual_overrides` (context_id, student_id, improved_final_manual_grade, updated_by, updated_at)
- New trimester lock storage:
  - `evaluation_trimester_locks` (context_id, t1_auto_closed, t2_auto_closed, t3_auto_closed, updated_by, updated_at)
  - Optional snapshot table if immutable audit of frozen auto values is required.

## 5. Authorization and RLS Strategy

RLS is mandatory and default-deny.

Access model:

- `platform_admin`: unrestricted access.
- `org_manager`: full access inside owned organization.
- `teacher`: own plans write access + shared read/import based on `visibility_scope`.

Visibility rules:

- `private`: owner, org managers in same organization, platform admins.
- `organization`: any active membership in same organization.
- `company`: any authenticated active member in any organization.

Admin provisioning rules:

- Access requests are stored in `public.access_requests`.
- Requested passwords are stored server-side in encrypted format and can be reused at approval time.
- Only `platform_admin` can read/update/delete access requests.
- Public request submission is handled server-side using service-role server actions (never direct client DB access).
- Account creation/update on approval is executed through Supabase Auth Admin APIs from server-only code.

## 6. Key Flows

### 6.1 Import Template to Teaching Plan

```mermaid
sequenceDiagram
    actor U as Teacher
    participant UI as Web UI
    participant SA as Server Action
    participant DB as PostgreSQL

    U->>UI: Select published template
    UI->>SA: importTemplate(templateId, organizationId)
    SA->>DB: Validate membership and visibility
    SA->>DB: Create teaching_plan with owner+organization
    SA->>DB: Deep copy RA/CE to plan graph
    SA->>DB: Save lineage metadata (source_template_id, source_version, imported_at)
    DB-->>SA: New plan id
    SA-->>UI: Redirect to plan workspace
```

### 6.2 Save Grade and Recompute

```mermaid
sequenceDiagram
    actor U as Teacher
    participant UI as Web UI
    participant SA as Server Action
    participant GE as Grade Engine
    participant DB as PostgreSQL

    U->>UI: Submit score
    UI->>SA: saveInstrumentScore(payload)
    SA->>DB: RLS check (plan write permission)
    SA->>DB: Upsert score row
    SA->>GE: recomputePlanAggregates(planId)
    GE-->>SA: ce/ra/final and completion metrics
    SA-->>UI: Updated metrics
```

### 6.3 Configure CE weight automation and instrument coverage

1. Teacher opens the `Pesos` tab, flips the “Automatizar pesos de CEs” switch, and can expand each RA to see its CE list and enter the percentage share (validated to sum 100%). The system marks those RA → CE distributions as canonical for the plan.
2. When editing an instrument, the UI now pairs each selected RA with a coverage percent input and exposes the CE share fields only if automation is off or the RA’s CE shares are invalidated. If automation is active and valid, the CE share inputs are disabled and the derived values are shown for transparency. Each instrument can also disable CE automation for itself with a local `ce_weight_auto` flag.
3. Saving the instrument persists `INSTRUMENT_RA_COVERAGE` rows (RA coverage percent) plus `INSTRUMENT_CE_WEIGHT` rows whose `coverage_percent` is computed as `RA coverage × CE share` whenever the instrument is in automated mode. Grade entry workflows read the same `INSTRUMENT_CE_WEIGHT` rows, so automated CE weights automatically apply to all instruments that touch the RA; manual instruments keep their own stored CE weights and must validate that each RA sums to 100%.
4. When the matrix editor updates a single RA coverage inline, the same persistence rules apply:
   - automated mode keeps the canonical CE shares from `plan_ce.weight_in_ra`
   - manual instruments keep their stored CE weights and the matrix only updates RA coverage
   - the instrument editor can still be used later to fine-tune the RA's CE weights

### 6.4 PRI/PMI resolution and improved grades

1. Teacher marks an instrument as `PRI/PMI` using a single checkbox and selects affected RAs (no RA weights, no CE weights).
2. Teacher enters optional per-student scores in the dedicated `PRIS/PMIS` tab; blank cell means no participation.
3. Grade engine computes RA original grades from standard instruments only.
4. For each student/RA, grade engine computes RA improved auto grade:
   - no PRI/PMI score => keep RA original
   - one or more PRI/PMI scores => use the most recent score
5. If teacher manually edits RA improved or final improved value, that value becomes persistent override and stops auto-recompute.
6. Trimester auto columns ignore PRI/PMI; trimester auto lock freezes only auto column recomputation.

### 6.5 Special adjusted-grade states

- `trimester_adjusted_grade` and `final_improved_final_grade` are stored as numeric sentinels so the schema stays compact.
- The UI exposes them through a dropdown with:
  - numeric values `1..10`
  - `NE` (`0`)
  - `MH` (`-1`)
  - `NM` (`-2`)
  - `SCA` (`-3`)
  - `PCO` (`-4`)
  - `EX` (`-5`)
  - `RC` (`-6`)
  - `CV` (`-7`)
  - `PFEOE` (`-8`)
- `NE` is the neutral "No Evaluado" state and supersedes the previous `-1` sentinel.
- Export and legend text must show the abbreviation, not the raw stored sentinel.

## 7. Versioning and Immutability

- Template unique key: `organization_id + region_code + module_code + academic_year + version`.
- `published` templates are mutable for corrections (e.g., matching BOJA updates).
- Curriculum modifications do _not_ retroactively affect existing `teaching_plans` due to the Deep Copy architecture.

## 8. Deployment Topology

- Vercel hosts Next.js app.
- Supabase hosts Postgres/Auth/Storage.
- GitHub Actions runs lint/typecheck/tests and optional migration checks.
- Branch mapping:
  - `develop` -> development deployment
  - `main` -> production deployment

## 9. Frontend Interaction Architecture

- Use a shared UI system based on Tailwind + shadcn primitives.
- Keep semantic structure in page shells:
  - `header`
  - `nav`
  - `main`
  - `aside` (when needed)
- Define responsive layout behavior per route:
  - desktop: full editing workspace
  - tablet: stacked or two-column adaptive layouts
  - mobile: simplified layout with prioritized actions

## 10. Critical Non-Functional Requirements

- Deterministic and test-covered grade calculations.
- Auditable lineage for all imports/forks.
- Predictable performance for high-volume plans.
- Mandatory documentation sync in code review.
- Accessibility baseline aligned with WCAG 2.2 AA in core flows.
- Responsive verification required for `320px`, `768px`, and `1280px`.
- Mobile parity delivered progressively based on usage and friction evidence.
- Usability baseline:
  - clear empty/loading/error states
  - consistent form feedback
  - keyboard-friendly interactions
