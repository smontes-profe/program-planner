# Program Planner - UI/UX Guidelines

## 1. Design Principles
- Clarity first: primary actions must be obvious.
- Progressive disclosure: show advanced options only when needed.
- Predictable behavior: consistent layouts, labels, and interaction patterns.

## 2. Responsive Strategy
- Required validation widths:
  - `320px` (small mobile)
  - `768px` (tablet)
  - `1280px` (desktop)
- Desktop and tablet are first-class in MVP.
- Mobile must support read and light-edit flows in MVP.
- Complex mobile editing can be improved iteratively after MVP.

## 3. Accessibility Baseline (WCAG 2.2 AA)
- Full keyboard operability.
- Visible focus states.
- Semantic structure (`header`, `nav`, `main`, `footer` where applicable).
- Form controls with associated labels and descriptions.
- Icon-only controls require accessible names.
- Color contrast targets:
  - normal text: at least `4.5:1`
  - large text: at least `3:1`

## 4. Usability Baseline
- Every async action must expose a loading state.
- Every failure path must expose an actionable error state.
- Empty states must guide next action.
- Destructive actions require confirmation.

## 5. Mobile Feasibility Plan
- After first production rollout, collect:
  - mobile session ratio
  - abandonment on key flows
  - support tickets linked to mobile usage
- Prioritize improvements by user impact and frequency.

## 6. Definition of UI Done
UI work is done only if:
1. Responsive checks pass at required widths.
2. Accessibility checks pass for affected interactions.
3. Usability states (loading/error/empty) are implemented.
4. Evidence is included in PR notes.
