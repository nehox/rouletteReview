import { describe, expect, it } from "vitest";
import {
  CRITERIA,
  aggregateReviews,
  computeWeightedScore,
} from "../src/lib/scoring";

function allScores(value: number) {
  return Object.fromEntries(CRITERIA.map((criterion) => [criterion.key, value]));
}

describe("computeWeightedScore", () => {
  it("donne 20/20 pour des notes maximales", () => {
    expect(computeWeightedScore(allScores(10))).toBe(20);
  });

  it("donne 10/20 pour des notes neutres", () => {
    expect(computeWeightedScore(allScores(5))).toBe(10);
  });

  it("donne 0 pour des notes nulles", () => {
    expect(computeWeightedScore(allScores(0))).toBe(0);
  });

  it("retourne null si un critère manque", () => {
    const scores = allScores(8);
    delete (scores as Record<string, number>).gitHistory;
    expect(computeWeightedScore(scores)).toBeNull();
  });

  it("respecte la pondération", () => {
    const scores = {
      ...allScores(0),
      cleanliness: 10,
      architecture: 10,
      unitTests: 10,
      uiTests: 10,
      comments: 10,
      gitHistory: 10,
    };
    expect(computeWeightedScore(scores)).toBe(20);
  });
});

describe("aggregateReviews", () => {
  it("moyenne les notes par critère et la note pondérée", () => {
    const result = aggregateReviews([
      { scores: allScores(10), weightedScore: 20 },
      { scores: allScores(5), weightedScore: 10 },
    ]);
    expect(result.reviewCount).toBe(2);
    expect(result.weightedScore).toBe(15);
    for (const criterion of CRITERIA) {
      expect(result.criteria[criterion.key]).toBe(7.5);
    }
  });

  it("gère l'absence de review", () => {
    const result = aggregateReviews([]);
    expect(result.reviewCount).toBe(0);
    expect(result.weightedScore).toBeNull();
    expect(result.criteria.cleanliness).toBeNull();
  });
});
