---
name: supabase-rls-ops
description: Design, implement, and review Supabase Row Level Security for multi-organization Next.js applications. Use when creating SQL migrations, writing policies, reviewing data exposure risk, or debugging authorization issues in this repository.
---

# Supabase RLS Ops

Apply this workflow for every schema or policy change that affects protected data.

## 1. Run the Entry Checklist

1. Read `docs/SPECS.md` and confirm locked decisions D1-D8.
2. Read `docs/ARCHITECTURE.md` for role model and visibility scopes.
3. Identify impacted tables and data paths.
4. Define expected read/write access for:
   - `platform_admin`
   - `org_manager`
   - `teacher`

## 2. Build the Access Matrix First

- Define table-by-table access before writing SQL.
- Distinguish actions explicitly: `select`, `insert`, `update`, `delete`.
- Include visibility scopes for shared resources:
  - `private`
  - `organization`
  - `company`

## 3. Implement Policy-First Migrations

- Enable RLS for every business table.
- Keep default-deny behavior.
- Add explicit policies per action and role condition.
- Keep migrations idempotent and ordered.
- Avoid mixing unrelated schema and policy changes in the same migration.

## 4. Author Safe Policy Predicates

- Resolve identity from auth context on database side.
- Scope data by `organization_id` and ownership fields.
- Use membership checks for cross-user organization access.
- Keep policy predicates readable and composable.
- Prefer explicit `exists` checks over fragile implicit joins.

## 5. Guard Against Common Security Regressions

- Never rely on frontend guards as the primary protection.
- Never grant app runtime queries through service-role credentials.
- Never accept client-provided owner/organization values without server verification.
- Never relax write policies to fix failing UI behavior.

## 6. Validate Policies Before Handoff

- Execute positive and negative access tests for each affected table.
- Confirm unauthorized reads/writes are blocked.
- Confirm expected role paths still work.
- Document policy intent in migration comments and PR notes.

## 7. Sync Documentation and Delivery

- Update architecture or specs when policy behavior changes.
- Update tasks status for completed security work.
- Report residual risks and confidence.

## References

- See `references/rls-migration-checklist.md`.
- See `references/rls-policy-patterns.md`.
