# Program Planner - UI/UX Guidelines

## 1. Design Principles

- Clarity first: primary actions must be obvious.
- Progressive disclosure: show advanced options only when needed.
- Predictable behavior: consistent layouts, labels, and interaction patterns.

## 2. Responsive Layout Baseline

- **Breakpoints**:
  - `320px` (Small Mobile): Single column layout, collapsed menus, font sizes optimized for small screens.
  - `768px` (Tablet): Two-column adaptive layouts, revealed sidebars where appropriate, touch-friendly targets.
  - `1280px` (Desktop): Full multi-column workspace, expanded navigation, full editing capabilities.
- **Layout Primitives**:
  - Use a fluid grid system (12 columns for desktop/tablet, 4 columns for mobile).
  - Consistent spacing scale (e.g., 4px, 8px, 16px, 24px, 32px).
  - Max content width: `1440px`.
- **Component Behavior**:
  - Tables: Horizontal scrolling with sticky columns on mobile/tablet.
  - Forms: Stacked fields on mobile, two-column on desktop.
  - Modals/Drawers: Full-screen drawers on mobile, centered modals on desktop.

## 3. Accessibility Acceptance Checklist

Before closing a task involving UI, ensure:

- [ ] **Keyboard Navigation**: All interactive elements are reachable via `Tab` and operable via `Enter`/`Space`.
- [ ] **Focus Management**: Visible focus rings are present and conform to color contrast standards.
- [ ] **Semantic HTML**: Use of `header`, `nav`, `main`, `footer`, `section`, `article`.
- [ ] **Form Labels**: Every input, select, and textarea has a programmatic label (visible or `aria-label`).
- [ ] **Contrast**: Check color contrast for normal text (`4.5:1`) and large text/UI components (`3:1`).
- [ ] **Status Indicators**: Status changes (success, error, warning) are marked with text/icons, not just color.
- [ ] **Touch Targets**: Minimum target size of `44x44px` for mobile interactive elements.
- [ ] **Aria Landmarks**: Proper usage of `aria-role` and landmarks for complex components.

## 4. Usability Standards (Loading, Error, Empty)

- **Loading States**:
  - Use **Skeletons** for initial page loads and large dashboard components.
  - Use **Spinners/Progress Bars** for small async actions (e.g., button submits, search-on-type).
  - Use **Loading Overlays** for full-page transitions only when necessary.
- **Error States**:
  - **Toasts**: For transient errors (e.g., "Network error", "Failed to save").
  - **Inline Messages**: For form validation failures (displayed next to the field).
  - **Persistent Callouts**: For global/blocking errors (e.g., "Page not found", "No permission").
- **Empty States**:
  - Must include a clear headline and description.
  - Must include a primary "Call to Action" (e.g., "Create your first plan").
  - Use an icon or illustration to set the tone (consistent with the brand).
- **Destructive Actions**: Always require explicit confirmation (modal or double-click pattern).

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
