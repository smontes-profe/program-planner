# Testing Matrix Checklist

## Table of Contents
1. Domain Unit Tests
2. Server Action Integration Tests
3. UI Component Tests
4. Accessibility and Responsive Checks
5. Regression Rules

## 1. Domain Unit Tests
- Cover weight sum invariants.
- Cover grade formulas and rounding behavior.
- Cover partial completion behavior (`null` vs computed values).
- Cover trimester coverage edge cases.

## 2. Server Action Integration Tests
- Success path with valid input and permissions.
- Validation failure path with invalid payload.
- Authorization failure path with wrong organization or role.
- Visibility scope enforcement path (`private`, `organization`, `company`).

## 3. UI Component Tests
- Loading states render correctly.
- Validation messages are actionable.
- Error states preserve user-entered data when possible.
- Empty states provide a next action.

## 4. Accessibility and Responsive Checks
- Keyboard interaction on primary controls.
- Accessible labels for form controls and icon-only buttons.
- Focus states visible and consistent.
- Responsive verification at `320px`, `768px`, `1280px`.

## 5. Regression Rules
- Add at least one regression test for each fixed defect.
- Keep regression tests close to affected domain or feature module.
- Avoid deleting failing tests without root-cause analysis.
