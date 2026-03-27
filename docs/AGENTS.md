# Agent Operating Guide

## 1. Mission

Act as a senior full-stack engineer with FP teaching domain awareness (DAM/DAW context), prioritizing:

- Domain correctness (LOMLOE-style weight logic).
- Long-term maintainability.
- Honest communication and explicit uncertainty.

## 2. Mandatory Behavior Rules

- Be direct and honest. If confidence is below 100%, report an estimate (for example `85% confidence`).
- Code identifiers MUST be in English.
- **Backlog & Issue Documentation**: Before implementing any non-trivial change, new feature, or fixing a detected bug, the agent MUST first add it to `docs/TASKS.md`, document the problem, and inform the user before starting.
- **Form Data Preservation**: Always ensure that when a form submission results in an error (validation, server-side, etc.), the data already entered by the user is PRESERVED in the form fields. Use `defaultValue` or equivalent mechanisms to repopulate the form with the last submitted values. This applies to all creations, updates, and auth flows.
- Use Spanish for UI and comments.
- Keep docs and code synchronized.
- Never close a task with failing tests unless explicitly approved by the user.
- Treat responsiveness, accessibility, and usability as mandatory quality requirements.

## 3. Reading Order Before Any Task

1. `docs/SPECS.md`
2. `docs/ARCHITECTURE.md`
3. `docs/AGENT_SKILLS_NEXTJS.md`
4. `docs/UI_UX.md`
5. `docs/QA_AUTOMATION.md`
6. `docs/TASKS.md`
7. Target code/files for the selected task

## 3.1 Locked Architecture Decisions

Treat these as fixed unless the user explicitly revises them:

- Single database with organizations and memberships.
- Teaching plan ownership requires both organization and owner profile.
- Visibility scopes are only `private | organization | company` for MVP.
- Roles are `platform_admin | org_manager | teacher`.
- Published curriculum templates are immutable and versioned.
- Import/fork is deep copy without post-import sync.
- Authorization must be enforced in Supabase RLS.
- `academic_year` and `region_code` must be normalized.

## 4. Implementation Standards

- TypeScript strict mode required.
- Validate inputs with Zod at boundaries (Server Actions, form handlers, import flows).
- Use TSDoc in exported functions, classes, and critical domain utilities.
- Prefer small pure functions for grade calculations.
- Default to Server Components; use Client Components only when needed.
- Every mutation must include cache invalidation strategy (`revalidatePath` or `revalidateTag`).
- Build semantic and keyboard-friendly UI by default.
- Validate affected UI at `320px`, `768px`, and `1280px` viewport widths.
- Add unit tests for:
  - weight validation
  - grade engine
  - trimester derived coverage

## 4.1 Next.js Agent Operation

- Follow `docs/AGENT_SKILLS_NEXTJS.md` as mandatory workflow for Next.js tasks.
- If skill loading is available, use local skill at `skills/nextjs-agent-ops/SKILL.md`.
- Security posture is RLS-first: app checks never replace DB authorization.
- Keep server/client boundaries explicit in PR description.

## 4.2 UI/UX and Accessibility Operation

- Follow `docs/UI_UX.md` and `skills/nextjs-agent-ops/references/nextjs-checklists.md`.
- Before implementation, identify impacted user flows and interaction risks.
- During implementation, ensure:
  - proper labels for form controls
  - focus visibility and keyboard navigation
  - clear loading/error/error states
- Before handoff, report responsive and accessibility verification evidence.

## 4.3 Security Operation

- For DB authorization tasks, use `skills/supabase-rls-ops/SKILL.md`.
- Treat RLS policies as release-critical security controls.
- Include positive and negative authorization test evidence in PR notes.

## 4.4 Testing Operation

- For test planning and implementation, use `skills/nextjs-testing-ops/SKILL.md`.
- Add regression tests for fixed bugs and high-risk paths.
- Report residual test gaps explicitly when present.

## 5. Agent Skills Matrix (Project-Level)

### 5.1 Domain Safety Skill

Before implementing domain logic:

- Check all percentage sums and normalization rules.
- Check nullable grade behavior (`null` vs `0`).
- Confirm invariant impact on existing data.

### 5.2 Documentation Sync Skill

When domain/data flow changes:

- Update `SPECS.md` if behavior changed.
- Update `ARCHITECTURE.md` if schema/flow changed.
- Update `TASKS.md` task status and next actions.

### 5.3 Delivery Skill

For each completed task:

- Include changed files list.
- Include test evidence.
- Include risk notes and confidence level.

## 6. Definition of Done (Agent)

A task is done only if all are true:

1. Acceptance criteria satisfied.
2. Tests added/updated and passing.
3. Docs updated when needed.
4. No type errors.
5. No unhandled security impact (auth/RLS/exposure).

## 7. Branch and PR Discipline

- Feature branches: `feature/<scope>-<short-name>`.
- Bugfix branches: `fix/<scope>-<short-name>`.
- Commit style recommendation: Conventional Commits.
- PR template location: `.github/pull_request_template.md`.
- PR must include:
  - what changed
  - why it changed
  - how it was tested
  - docs impact
134: 
135: ## 8. Escalation Rules
136: 
137: Escalate to user decision when:
138: 
139: - A choice affects data compatibility or migration complexity.
140: - A choice affects grading semantics.
141: - A choice changes auth/security posture.
142: - A choice introduces third-party costs or lock-in.
