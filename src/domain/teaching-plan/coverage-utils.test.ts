import { describe, expect, it } from "vitest";

import { buildMatrixCeWeights, splitPercentageEvenly } from "./coverage-utils";

describe("splitPercentageEvenly", () => {
  it("splits 100% across 7 CEs and puts the rounding remainder on the last one", () => {
    const result = splitPercentageEvenly(["a", "b", "c", "d", "e", "f", "g"]);

    expect(result).toHaveLength(7);
    expect(result.map((item) => item.weight)).toEqual([
      14.28,
      14.28,
      14.28,
      14.28,
      14.28,
      14.28,
      14.32,
    ]);
    expect(result.reduce((sum, item) => sum + item.weight, 0)).toBeCloseTo(100, 2);
  });
});

describe("buildMatrixCeWeights", () => {
  it("scales CE shares when automation is enabled", () => {
    const result = buildMatrixCeWeights(
      [
        { ceId: "a", weightInRa: 20, orderIndex: 1 },
        { ceId: "b", weightInRa: 30, orderIndex: 2 },
        { ceId: "c", weightInRa: 50, orderIndex: 3 },
      ],
      40,
      true
    );

    expect(result).toEqual([
      { ceId: "a", weight: 8 },
      { ceId: "b", weight: 12 },
      { ceId: "c", weight: 20 },
    ]);
  });
});
