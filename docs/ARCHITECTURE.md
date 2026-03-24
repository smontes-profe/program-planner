# Program Planner - System Architecture

## 1. Architectural Style
- Framework: Next.js App Router (server-first).
- Backend pattern: Server Actions + Supabase client.
- Data store: PostgreSQL (Supabase) with strict relational integrity.
- AuthN/AuthZ: Supabase Auth + Row Level Security (RLS).
- Security strategy: database-enforced authorization, app checks as secondary layer.

## 2. Logical Modules
- `auth`: sign-up/sign-in/session management.
- `organization`: organization and membership management.
- `curriculum`: versioned curriculum templates by region/module/year.
- `teaching-plan`: teacher-owned planning graph.
- `evaluation`: instrument coverage and grade engine.
- `collaboration`: import/fork and lineage.
- `admin`: cross-organization moderation and support.

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

    TEACHING_PLAN ||--o{ DIDACTIC_UNIT : includes
    DIDACTIC_UNIT }o--o{ PLAN_CE : covers

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
        timestamptz created_at
    }

    TEMPLATE_RA {
        uuid id PK
        uuid template_id FK
        string code
        text description
        numeric weight_in_template
    }

    TEMPLATE_CE {
        uuid id PK
        uuid template_ra_id FK
        string code
        text description
        numeric weight_in_ra
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
        string status "draft|ready|published|archived"
        timestamptz imported_at
        timestamptz created_at
    }

    PLAN_RA {
        uuid id PK
        uuid plan_id FK
        string code
        text description
        numeric weight_in_plan
    }

    PLAN_CE {
        uuid id PK
        uuid plan_ra_id FK
        string code
        text description
        numeric weight_in_ra
    }

    DIDACTIC_UNIT {
        uuid id PK
        uuid plan_id FK
        string code
        string title
        text description
        string trimester "T1|T2|T3"
        int display_order
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

## 7. Versioning and Immutability
- Template unique key: `organization_id + region_code + module_code + academic_year + version`.
- `published` templates are immutable.
- Any functional update requires new version row (for example `v2`).

## 8. Deployment Topology
- Vercel hosts Next.js app.
- Supabase hosts Postgres/Auth/Storage.
- GitHub Actions runs lint/typecheck/tests and optional migration checks.
- Branch mapping:
  - `develop` -> development deployment
  - `main` -> production deployment

## 9. Critical Non-Functional Requirements
- Deterministic and test-covered grade calculations.
- Auditable lineage for all imports/forks.
- Predictable performance for high-volume plans.
- Mandatory documentation sync in code review.
