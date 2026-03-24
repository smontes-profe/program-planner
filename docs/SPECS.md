# Program Planner - Business Specifications

## 1. Product Scope
Program Planner is a web platform for FP teachers to design, evaluate, and share didactic programming for one or more modules.

Primary goals:
- Support multi-region curricula (different autonomous communities, same module, different rules).
- Support academic-year versioning (for example `2026/2027`).
- Provide complete traceability from `RA -> CE -> UT -> Instrument -> Grade`.
- Keep legal and pedagogical consistency through strict weight validation.
- Enable collaboration through public templates and safe cloning (fork model).

## 2. User Roles
- `teacher`: create and manage own teaching plans, optionally publish templates.
- `admin`: manage users, roles, and moderation of shared/public content.

Authentication requirements:
- Corporate email based sign-up (domain allowlist optional but recommended).
- Login with email magic link or password + optional MFA (phased rollout allowed).

## 3. Core Domain Model

### 3.1 Curriculum Template (Public Knowledge)
A curriculum template is a public structure reusable by teachers:
- Region (`region_code`), academic year (`academic_year`), study level, and module metadata.
- Learning results (`RA`) with weights in module scope.
- Evaluation criteria (`CE`) with weights in RA scope.

Business rule:
- Templates are public-by-default once published and can be imported by any teacher.

### 3.2 Teaching Plan (Private Working Copy)
A teaching plan is teacher-owned and editable:
- Can be created from scratch or cloned from a public template/plan.
- Contains its own RA/CE tree after cloning.
- Includes didactic units, instruments, grade records, and trimester planning.

Business rule:
- Editing a teaching plan never mutates the source template/plan.

### 3.3 Didactic Planning
- A didactic unit (`UT`) belongs to one teaching plan.
- A `UT` can cover one or many `CE`.
- A `CE` can be covered by one or many `UT`.
- Each `UT` is assigned to one trimester (`T1`, `T2`, `T3`).

### 3.4 Evaluation
- An evaluation instrument belongs to one teaching plan.
- Instrument types include: `exam`, `project`, `activity`, `form`, `teacher_notebook`, `custom`.
- Each instrument maps to one or many `CE` with a specific coverage percentage.
- Grade input modes:
  - `simple`: one grade is replicated to all CE linked to the instrument.
  - `advanced`: grade is entered per CE.

## 4. Weight and Consistency Rules
All weights are percentages in `[0, 100]`, stored as decimals.

Hard invariants:
1. For each teaching plan, sum of `RA.weight_in_plan` MUST equal `100`.
2. For each RA, sum of child `CE.weight_in_ra` MUST equal `100`.
3. For each CE, sum of `InstrumentCEWeight.coverage_percent` SHOULD equal `100`.
4. Any mutation that breaks a hard invariant blocks publish and shows validation errors.

Soft invariants:
- Rule 3 can be temporarily incomplete while drafting, but must be `100` for final grading and publish.

Rounding policy:
- Internal calculations use decimal precision (at least 4 decimals).
- UI shows max 2 decimals.
- Final displayed grade rounds half-up to 2 decimals.

## 5. Grade Engine

### 5.1 Formula Definitions
For each criterion:

`ce_grade = sum(instrument_grade_for_ce * instrument_coverage_for_ce)`

Where `instrument_coverage_for_ce` is normalized to `[0, 1]`.

For each learning result:

`ra_grade = sum(ce_grade * ce_weight_in_ra)`

For final module grade:

`final_grade = sum(ra_grade * ra_weight_in_plan)`

Where `ce_weight_in_ra` and `ra_weight_in_plan` are normalized to `[0, 1]`.

### 5.2 Missing Data Behavior
- If a CE has no graded instruments, CE grade is `null` (not zero).
- RA and final grade use only completed child items and expose completion ratio.
- UI must clearly separate:
  - `computed_partial_grade`
  - `grade_completion_percent`

## 6. Trimester Logic
Trimester assignment comes from UT.

Derived outputs per trimester:
- Active UT list.
- Active CE list (covered by trimester UT).
- Active RA list (parents of trimester CE).
- Coverage percent by CE, RA, UT, and instrument.

Business rule:
- A CE can appear in multiple trimesters if covered by multiple UT in different trimesters.

## 7. Visibility and Collaboration

Visibility modes:
- `private`: only owner and admins.
- `public`: visible to all teachers for read/import.

Import/fork behavior:
- Import performs deep copy of all related entities.
- Imported plan stores lineage metadata:
  - `source_plan_id`
  - `source_version`
  - `imported_at`
- Changes after import are isolated.

## 8. Multi-Region and Versioning Rules
- Curriculum templates are indexed by:
  - `region_code`
  - `module_code`
  - `academic_year`
  - `study_level`
- Two templates with same key can coexist only with different semantic versions (`v1`, `v2`, ...).
- Teachers can pick template version during import.

## 9. Curriculum Input Modes
- `manual`: teacher creates RA/CE by hand (mandatory support from day 1).
- `pdf_assisted` (future-ready): AI assistant extracts draft RA/CE from uploaded PDF and requires teacher confirmation before save.

Non-negotiable rule:
- AI extraction never publishes directly; teacher confirmation is required.

## 10. Technical Constraints
- Type-safe contracts with TypeScript for all domain entities.
- Input validation with Zod in Server Actions and API boundaries.
- PostgreSQL constraints + foreign keys + cascading deletes where safe.
- RLS in Supabase so teachers only read/write owned plans unless content is public.
- Unit tests required for all grade and weighting functions.

## 11. Definition of Done for Domain Features
A feature is complete only if:
1. Domain behavior matches this document.
2. Validation and error states are covered.
3. Unit tests pass.
4. Docs (`SPECS.md`, `ARCHITECTURE.md`, `TASKS.md`) are updated.
