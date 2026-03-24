# Next.js Checklists

## Table of Contents
1. Mutation Checklist
2. Data Fetch and Cache Checklist
3. Security Checklist
4. Responsive and Accessibility Checklist
5. Testing Checklist
6. Anti-Patterns

## 1. Mutation Checklist
- Validate payload with Zod.
- Resolve session and organization context on server.
- Verify role and visibility scope before write.
- Execute mutation in single logical unit.
- Revalidate impacted paths/tags.
- Return typed success/error object.

## 2. Data Fetch and Cache Checklist
- Define cache behavior intentionally (`no-store`, timed revalidation, tags).
- Use stable cache tags by domain (`plan:<id>`, `template:<id>`).
- Keep protected reads on server.
- Avoid duplicate fetching in client and server for same data.

## 3. Security Checklist
- Keep RLS enabled and default-deny.
- Ensure read policies include visibility scopes:
  - `private`
  - `organization`
  - `company`
- Ensure write policies match owner and role rules.
- Cover denied access scenarios in tests.

## 4. Responsive and Accessibility Checklist
- Verify affected screens at:
  - `320px`
  - `768px`
  - `1280px`
- Ensure no core action requires horizontal scroll.
- Ensure keyboard-only navigation can reach all controls.
- Ensure focus indicators are visible.
- Ensure icon-only controls have accessible labels.
- Ensure status is not conveyed by color alone.
- Ensure touch targets are mobile-friendly.

## 5. Testing Checklist
- Unit test critical formulas and percentage constraints.
- Integration test Server Actions for:
  - valid payload
  - invalid payload
  - unauthorized access
  - wrong organization access
- Add regression tests for known bugs.

## 6. Anti-Patterns
- Overusing `"use client"` at route level.
- Domain rules implemented only in UI.
- Mutation without explicit cache invalidation.
- Authorization implemented only in middleware without RLS checks.
- Shipping formula changes without unit tests.
- Shipping UI changes without responsive and accessibility checks.