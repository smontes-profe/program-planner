# Next.js Test Patterns

## Table of Contents
1. Domain Unit Pattern
2. Server Action Pattern
3. Component Behavior Pattern
4. Accessibility Pattern

## 1. Domain Unit Pattern
```ts
import { describe, expect, it } from "vitest";
import { calculateFinalGrade } from "@/domain/grades/calculate-final-grade";

describe("calculateFinalGrade", () => {
  it("returns deterministic weighted result", () => {
    const result = calculateFinalGrade({
      raGrades: [
        { value: 7, weightInPlan: 40 },
        { value: 9, weightInPlan: 60 },
      ],
    });

    expect(result).toBe(8.2);
  });
});
```

## 2. Server Action Pattern
```ts
import { describe, expect, it, vi } from "vitest";
import { saveInstrumentScoreAction } from "@/app/actions/save-instrument-score";

describe("saveInstrumentScoreAction", () => {
  it("rejects unauthorized writes", async () => {
    const result = await saveInstrumentScoreAction(
      { instrumentId: "i1", planCeId: "ce1", scoreValue: 8 },
      {
        auth: { profileId: "p2", organizationId: "org-b" },
        repository: {
          saveScore: vi.fn(),
          canWritePlan: vi.fn().mockResolvedValue(false),
        },
      },
    );

    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe("FORBIDDEN");
  });
});
```

## 3. Component Behavior Pattern
```ts
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreatePlanForm } from "./create-plan-form";

it("shows field error when title is empty", async () => {
  const user = userEvent.setup();
  render(<CreatePlanForm />);

  await user.click(screen.getByRole("button", { name: /create plan/i }));

  expect(screen.getByText(/title is required/i)).toBeInTheDocument();
});
```

## 4. Accessibility Pattern
```ts
import { render } from "@testing-library/react";
import { axe } from "jest-axe";
import { PlanDashboard } from "./plan-dashboard";

it("has no obvious accessibility violations", async () => {
  const { container } = render(<PlanDashboard />);
  const results = await axe(container);

  expect(results).toHaveNoViolations();
});
```
