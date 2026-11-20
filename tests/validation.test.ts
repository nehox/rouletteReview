import { describe, expect, it } from "vitest";
import {
  parseDraftPayload,
  parseReviewPayload,
} from "../src/lib/validation";
import { normalizeRepoUrl } from "../src/lib/repo";
import { CRITERIA } from "../src/lib/scoring";

function scores(value: number) {
  return Object.fromEntries(CRITERIA.map((criterion) => [criterion.key, value]));
}

describe("normalizeRepoUrl", () => {
  it("normalise les variantes GitHub", () => {
    expect(normalizeRepoUrl("github.com/Owner/Repo")).toBe(
      "https://github.com/Owner/Repo",
    );
    expect(normalizeRepoUrl("https://www.github.com/Owner/Repo.git")).toBe(
      "https://github.com/Owner/Repo",
    );
    expect(normalizeRepoUrl("https://github.com/Owner/Repo/")).toBe(
      "https://github.com/Owner/Repo",
    );
  });

  it("refuse les liens invalides", () => {
    expect(normalizeRepoUrl("https://gitlab.com/Owner/Repo")).toBeNull();
    expect(normalizeRepoUrl("https://github.com/Owner")).toBeNull();
    expect(normalizeRepoUrl("https://github.com/Owner/Repo/tree/main")).toBeNull();
  });
});

describe("parseReviewPayload", () => {
  it("accepte une review complète", () => {
    const result = parseReviewPayload({
      scores: scores(7),
      criterionComments: { cleanliness: "Bien" },
      generalComment: "Bon travail d'ensemble.",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.scores.cleanliness).toBe(7);
      expect(result.generalComment).toBe("Bon travail d'ensemble.");
    }
  });

  it("refuse une note hors bornes", () => {
    const result = parseReviewPayload({
      scores: { ...scores(7), cleanliness: 11 },
      generalComment: "Test",
    });
    expect(result.ok).toBe(false);
  });

  it("refuse un critère manquant", () => {
    const partial = scores(7);
    delete (partial as Record<string, number>).gitHistory;
    const result = parseReviewPayload({
      scores: partial,
      generalComment: "Test",
    });
    expect(result.ok).toBe(false);
  });
});

describe("parseDraftPayload", () => {
  it("accepte un brouillon partiel", () => {
    const result = parseDraftPayload({
      scores: { cleanliness: 8 },
      criterionComments: { architecture: "À revoir" },
      generalComment: "En cours",
    });
    expect(result.scores.cleanliness).toBe(8);
    expect(result.scores.architecture).toBeUndefined();
    expect(result.criterionComments.architecture).toBe("À revoir");
  });
});
