import { describe, expect, it } from "vitest";
import {
  CriteriaSchema,
  DEFAULT_CRITERIA,
  criteriaFromSettings,
} from "../src/lib/criteria";

describe("CriteriaSchema", () => {
  it("accepte la grille par défaut", () => {
    expect(CriteriaSchema.safeParse(DEFAULT_CRITERIA).success).toBe(true);
  });

  it("refuse des clés dupliquées", () => {
    const duplicated = [
      DEFAULT_CRITERIA[0],
      { ...DEFAULT_CRITERIA[1], key: DEFAULT_CRITERIA[0].key },
    ];
    expect(CriteriaSchema.safeParse(duplicated).success).toBe(false);
  });

  it("refuse une somme de poids différente de 100 %", () => {
    const invalid = [
      { ...DEFAULT_CRITERIA[0], weight: 0.5 },
      ...DEFAULT_CRITERIA.slice(1),
    ];
    expect(CriteriaSchema.safeParse(invalid).success).toBe(false);
  });
});

describe("criteriaFromSettings", () => {
  it("retourne la grille par défaut si la configuration est absente ou invalide", () => {
    expect(criteriaFromSettings({ reviewCriteria: null })).toEqual(
      DEFAULT_CRITERIA,
    );
    expect(
      criteriaFromSettings({ reviewCriteria: [{ key: "incomplet" }] }),
    ).toEqual(DEFAULT_CRITERIA);
  });

  it("retourne la grille enregistrée quand elle est valide", () => {
    const custom = DEFAULT_CRITERIA.slice(0, 2).map((criterion) => ({
      ...criterion,
      weight: 0.5,
    }));
    expect(criteriaFromSettings({ reviewCriteria: custom })).toEqual(custom);
  });
});
