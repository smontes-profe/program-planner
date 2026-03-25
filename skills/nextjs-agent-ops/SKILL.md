---
name: nextjs-agent-ops
description: Operate safely and consistently in Next.js App Router projects using Server Actions, explicit cache strategy, server/client boundary control, responsive UI baseline, accessibility checks, and RLS-first authorization. Use when implementing or reviewing any Next.js feature in this repository.
---

# Next.js Agent Ops

Follow this workflow for every Next.js task.

## 1. Run the Entry Checklist
1. Read `docs/SPECS.md`.
2. Read `docs/ARCHITECTURE.md`.
3. Read `docs/AGENT_SKILLS_NEXTJS.md`.
4. Identify touched domains: `curriculum`, `teaching-plan`, `evaluation`, `organization`, `admin`.

## 2. Design Server/Client Boundaries
- Keep route segments and pages as Server Components by default.
- Add Client Components only for hooks, events, or browser APIs.
- Keep domain calculations and authorization decisions in server-side code.

## 2.1 Enforce Responsive and Accessibility Baseline
- Treat responsive behavior as mandatory in every UI change.
- Verify affected views at `320px`, `768px`, and `1280px`.
- Ensure keyboard navigation and visible focus states.
- Use semantic structure and accessible labels for controls.

## 3. Implement Mutations with Server Actions
- Validate input using Zod at action entry.
- Resolve user identity on server and validate organization scope.
- Execute write operations.
- Trigger revalidation with `revalidatePath` or `revalidateTag`.
- Return typed action results (`ok`, `error`, metadata).

## 4. Enforce Security Model
- Treat Supabase RLS as primary authorization.
- Never trust client-provided ownership fields without server verification.
- Ensure visibility rules (`private|organization|company`) are enforced in reads.

## 5. Test with Risk-Based Priority
- Add unit tests for pure domain logic (weights, grades, trimester coverage).
- Add integration tests for Server Actions and permission checks.
- Add regression test for each bug fix.

## 6. Sync Documentation
- Update `docs/SPECS.md` if behavior changes.
- Update `docs/ARCHITECTURE.md` if data model/flow changes.
- Update `docs/TASKS.md` status.

## 7. Validate Before Handoff
- Confirm changed routes build and type-check.
- Confirm error states are handled and surfaced.
- Confirm cache invalidation path is explicit.
- Confirm responsive and accessibility checks were executed for affected UI.
- Report residual risks and confidence.

## References
- See `references/nextjs-checklists.md` for detailed checklists and anti-patterns.