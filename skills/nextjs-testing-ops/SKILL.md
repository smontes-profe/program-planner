---
name: nextjs-testing-ops
description: Plan and execute robust testing for Next.js App Router features, including domain unit tests, Server Action integration tests, component behavior tests, and accessibility/responsive verification. Use when implementing features, fixing bugs, or reviewing PR test coverage in this repository.
---

# Next.js Testing Ops

Apply this workflow whenever code changes behavior.

## 1. Run the Entry Checklist
1. Read `docs/SPECS.md`, `docs/ARCHITECTURE.md`, and `docs/UI_UX.md`.
2. Identify impacted domain rules and user flows.
3. List regression risks before writing tests.

## 2. Build a Risk-Based Test Matrix
- Add tests by impact and fragility, not only by file touched.
- Cover these layers when relevant:
  - domain unit tests
  - Server Action integration tests
  - UI component behavior tests
  - accessibility and responsive checks

## 3. Test Domain Logic as Pure Functions
- Keep critical formulas and validators isolated.
- Use deterministic inputs and expected outputs.
- Cover edge cases (`0`, `100`, empty data, null grade paths).

## 4. Test Server Actions with Auth Context
- Validate success, validation failure, and authorization failure paths.
- Verify organization and visibility constraints in test scenarios.
- Confirm cache revalidation behavior is not silently skipped.

## 5. Test UI Behavior and Accessibility
- Verify loading, error, empty, and success states.
- Verify form error mapping and submit behavior.
- Verify keyboard access and accessible labels for interactive controls.
- Verify responsive behavior at `320px`, `768px`, and `1280px` for affected flows.

## 6. Prevent Flaky and Low-Value Tests
- Avoid testing implementation details.
- Use stable selectors and deterministic fixtures.
- Keep mock scope minimal and explicit.
- Add regression test for each fixed bug.

## 7. Validate Before Handoff
- Confirm new behavior is covered by meaningful tests.
- Confirm changed critical paths are protected by at least one regression test.
- Confirm test names describe behavior clearly.
- Report known test gaps and confidence.

## References
- See `references/testing-matrix-checklist.md`.
- See `references/nextjs-test-patterns.md`.
