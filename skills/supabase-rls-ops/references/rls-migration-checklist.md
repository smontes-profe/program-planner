# RLS Migration Checklist

## Table of Contents

1. Pre-Migration Checklist
2. Migration Checklist
3. Validation Checklist
4. PR Evidence Checklist

## 1. Pre-Migration Checklist

- List all impacted tables.
- List required actions per table (`select`, `insert`, `update`, `delete`).
- Map access by role and scope.
- Confirm ownership and organization columns exist where required.

## 2. Migration Checklist

- Enable RLS on each impacted table.
- Keep default deny.
- Add explicit policy per action.
- Add policy names with clear intent.
- Keep migration order deterministic.

## 3. Validation Checklist

- Verify allowed access for:
  - plan owner
  - same-organization manager
  - same-organization teacher (when applicable)
  - cross-organization member (only for `company` visibility)
  - platform admin
- Verify denied access for:
  - unauthenticated session
  - non-member access to organization resources
  - member attempting unauthorized write

## 4. PR Evidence Checklist

- Include list of tables and policies changed.
- Include why each policy exists.
- Include positive/negative test outputs.
- Include known limitations or follow-up tasks.
