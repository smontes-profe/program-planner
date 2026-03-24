# Agent Skills - Next.js Operating Playbook

## 1. Purpose
Define how agents should operate in this project when implementing Next.js features, with predictable quality and low regression risk.

## 2. Skill N1 - Server/Client Boundary Design
When to apply:
- Any new page, layout, form, table, or dashboard feature.

Rules:
- Default to Server Components.
- Use Client Components only when hooks/events/browser APIs are required.
- Keep business rules out of Client Components.

Done criteria:
- Minimal client bundle impact.
- No server-only API imported in client code.

Anti-patterns:
- Marking entire route trees as `"use client"` by default.
- Executing domain calculations in UI components.

## 3. Skill N2 - Server Action Mutation Pattern
When to apply:
- Create/update/delete operations.

Rules:
- Validate input with Zod at action boundary.
- Execute authorization checks before mutation.
- Return typed result payloads (`ok`, `error`, metadata).
- Trigger `revalidatePath` or `revalidateTag` when mutation affects cached views.

Done criteria:
- Invalid input and unauthorized paths are explicitly handled.
- Cache is correctly invalidated after writes.

Anti-patterns:
- Silent failures in actions.
- Mutations without revalidation strategy.

## 4. Skill N3 - Data Fetching and Cache Strategy
When to apply:
- Any read query used in Server Components.

Rules:
- Define cache intent explicitly (`no-store`, revalidate interval, or tag-based).
- Use stable cache tags per domain slice (for example `plan:<id>`, `template:<id>`).
- Prefer server-side data fetching for protected data.

Done criteria:
- Cache policy is documented in code near query.
- Stale data behavior is known and acceptable.

Anti-patterns:
- Mixed ad-hoc cache behavior.
- Relying on client re-fetch for core protected data.

## 5. Skill N4 - Auth and RLS-First Security
When to apply:
- Any query or mutation involving protected data.

Rules:
- Treat RLS as primary guard, app logic as secondary guard.
- Resolve user session on server.
- Scope all reads/writes by organization and role context.

Done criteria:
- Unauthorized reads/writes fail even if frontend guard is bypassed.
- Tests cover forbidden access scenarios.

Anti-patterns:
- Trusting client-provided organization or owner identifiers without server verification.
- Security rules implemented only in UI.

## 6. Skill N5 - Form UX and Error Handling
When to apply:
- Forms with Server Actions.

Rules:
- Use typed form schemas with field-level and form-level error mapping.
- Preserve user input on validation failure.
- Show pending/loading states.
- Surface domain validation failures clearly (for example sum of weights != 100).

Done criteria:
- User receives actionable error feedback.
- No data loss on failed submit.

Anti-patterns:
- Generic error messages for domain validation.
- Blocking UI without pending indicators.

## 7. Skill N6 - Domain Testing Strategy
When to apply:
- Every feature that touches grade logic, percentages, visibility, or authorization.

Rules:
- Unit tests for pure domain functions (weights, grading, trimester coverage).
- Integration tests for Server Actions with auth context.
- Regression tests for fixed bugs.

Done criteria:
- Critical paths are deterministic and test-covered.
- Edge cases are represented in tests.

Anti-patterns:
- Relying only on UI tests for domain logic.
- Shipping changed formulas without new tests.

## 8. Skill N7 - Route and Module Structure
When to apply:
- New route groups and feature modules.

Rules:
- Keep route structure aligned with domain modules (`curriculum`, `teaching-plan`, `evaluation`).
- Co-locate feature-specific UI and action files.
- Keep shared domain logic in dedicated `/domain` modules.

Done criteria:
- Files are easy to locate by feature ownership.
- Cross-feature coupling is minimized.

Anti-patterns:
- Global utility dumps with mixed domain concerns.
- Duplicate logic between routes.

## 9. Skill N8 - Responsive and Accessibility by Default
When to apply:
- Any UI component, form, table, modal, or dashboard change.

Rules:
- Start from semantic HTML and progressive enhancement.
- Ensure keyboard navigation and visible focus for all interactive elements.
- Verify responsive behavior at `320px`, `768px`, and `1280px`.
- Avoid horizontal scrolling for core workflows.
- Ensure clear empty/loading/error states and actionable validation messages.

Done criteria:
- Core flow is usable in desktop and tablet.
- Mobile layout remains readable and operable for key actions.
- No obvious accessibility blockers in manual verification.

Anti-patterns:
- Icon-only controls without accessible labels.
- Color-only status indicators without text alternatives.
- Touch targets too small for mobile interaction.

## 10. Skill N9 - Agent Operating Loop for Next.js Tasks
Execution sequence:
1. Read `SPECS.md` + `ARCHITECTURE.md` + `UI_UX.md` + this file.
2. Identify impacted server/client boundaries.
3. Define responsive and accessibility acceptance checks for impacted UI.
4. Implement change with Zod + auth + cache plan.
5. Add/update tests.
6. Update docs if behavior or architecture changed.
7. Report risks and confidence.

Definition of done:
- Build/type/tests pass for touched scope.
- Security and cache behavior are explicit.
- Docs and code are consistent.

## 11. Reusable Skill Package
- Mirror this guide in reusable skill format at:
  - `skills/nextjs-agent-ops/SKILL.md`
  - `skills/nextjs-agent-ops/references/nextjs-checklists.md`
- Complementary skills:
  - `skills/supabase-rls-ops/SKILL.md`
  - `skills/nextjs-testing-ops/SKILL.md`
