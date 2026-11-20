import { describe, expect, it } from "vitest";
import { generateDraw, verifyDraw } from "../src/lib/draw";

function mulberry32(seed: number) {
  return function random() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const sizes = [4, 5, 7, 10, 30];

describe("generateDraw", () => {
  it("refuse moins de 4 groupes", () => {
    expect(() => generateDraw([1, 2, 3])).toThrow();
  });

  it.each(sizes)(
    "produit un graphe 2-régulier valide pour %i groupes",
    (size) => {
      const groupIds = Array.from({ length: size }, (_, index) => index + 1);
      for (let iteration = 0; iteration < 20; iteration += 1) {
        const edges = generateDraw(groupIds);
        expect(edges).toHaveLength(size * 2);
        expect(verifyDraw(groupIds, edges)).toEqual([]);
      }
    },
  );

  it("est reproductible avec la même graine", () => {
    const groupIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const first = generateDraw(groupIds, mulberry32(42));
    const second = generateDraw(groupIds, mulberry32(42));
    expect(second).toEqual(first);
  });

  it("ne contient ni auto-review ni doublon", () => {
    const groupIds = [10, 20, 30, 40, 50, 60];
    const edges = generateDraw(groupIds, mulberry32(7));
    const seen = new Set<string>();
    for (const edge of edges) {
      expect(edge.reviewerGroupId).not.toBe(edge.reviewedGroupId);
      const key = `${edge.reviewerGroupId}->${edge.reviewedGroupId}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });
});
