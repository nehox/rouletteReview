export interface DrawEdge {
  reviewerGroupId: number;
  reviewedGroupId: number;
}

export type RandomSource = () => number;

export function shuffle<T>(items: T[], rng: RandomSource = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

const edgeKey = (reviewer: number, reviewed: number) =>
  `${reviewer}->${reviewed}`;

/**
 * Construit un graphe dirigé 2-régulier : chaque groupe review exactement
 * 2 projets, chaque projet est reviewé exactement 2 fois, sans auto-review
 * ni doublon. La base est un graphe circulant relabellisé aléatoirement,
 * puis amélioré par des échanges d'arêtes préservant les degrés.
 */
export function generateDraw(
  groupIds: number[],
  rng: RandomSource = Math.random,
): DrawEdge[] {
  const n = groupIds.length;
  if (n < 4) {
    throw new Error(
      "Il faut au moins 4 groupes inscrits pour lancer un tirage équitable.",
    );
  }

  const permutation = shuffle(groupIds, rng);
  const edges: DrawEdge[] = [];
  for (let i = 0; i < n; i += 1) {
    edges.push({
      reviewerGroupId: permutation[i],
      reviewedGroupId: permutation[(i + 1) % n],
    });
    edges.push({
      reviewerGroupId: permutation[i],
      reviewedGroupId: permutation[(i + 2) % n],
    });
  }

  for (let iteration = 0; iteration < n * 6; iteration += 1) {
    const firstIndex = Math.floor(rng() * edges.length);
    let secondIndex = Math.floor(rng() * edges.length);
    if (firstIndex === secondIndex) {
      secondIndex = (secondIndex + 1) % edges.length;
    }

    const first = edges[firstIndex];
    const second = edges[secondIndex];
    if (first.reviewerGroupId === second.reviewerGroupId) continue;
    if (first.reviewedGroupId === second.reviewedGroupId) continue;

    const candidateFirst: DrawEdge = {
      reviewerGroupId: first.reviewerGroupId,
      reviewedGroupId: second.reviewedGroupId,
    };
    const candidateSecond: DrawEdge = {
      reviewerGroupId: second.reviewerGroupId,
      reviewedGroupId: first.reviewedGroupId,
    };

    if (candidateFirst.reviewerGroupId === candidateFirst.reviewedGroupId) {
      continue;
    }
    if (candidateSecond.reviewerGroupId === candidateSecond.reviewedGroupId) {
      continue;
    }

    const existing = new Set(
      edges.map((edge) => edgeKey(edge.reviewerGroupId, edge.reviewedGroupId)),
    );
    existing.delete(edgeKey(first.reviewerGroupId, first.reviewedGroupId));
    existing.delete(edgeKey(second.reviewerGroupId, second.reviewedGroupId));

    if (
      existing.has(
        edgeKey(candidateFirst.reviewerGroupId, candidateFirst.reviewedGroupId),
      ) ||
      existing.has(
        edgeKey(
          candidateSecond.reviewerGroupId,
          candidateSecond.reviewedGroupId,
        ),
      )
    ) {
      continue;
    }

    edges[firstIndex] = candidateFirst;
    edges[secondIndex] = candidateSecond;
  }

  return shuffle(edges, rng);
}

export function verifyDraw(groupIds: number[], edges: DrawEdge[]): string[] {
  const errors: string[] = [];
  const outgoing = new Map<number, number>();
  const incoming = new Map<number, number>();
  const seen = new Set<string>();

  for (const id of groupIds) {
    outgoing.set(id, 0);
    incoming.set(id, 0);
  }

  for (const edge of edges) {
    if (!outgoing.has(edge.reviewerGroupId)) {
      errors.push(`Groupe inconnu en sortie : ${edge.reviewerGroupId}`);
      continue;
    }
    if (!incoming.has(edge.reviewedGroupId)) {
      errors.push(`Groupe inconnu en entrée : ${edge.reviewedGroupId}`);
      continue;
    }
    if (edge.reviewerGroupId === edge.reviewedGroupId) {
      errors.push(`Auto-review interdit pour le groupe ${edge.reviewerGroupId}`);
    }
    const key = edgeKey(edge.reviewerGroupId, edge.reviewedGroupId);
    if (seen.has(key)) {
      errors.push(`Doublon d'affectation : ${key}`);
    }
    seen.add(key);
    outgoing.set(edge.reviewerGroupId, (outgoing.get(edge.reviewerGroupId) ?? 0) + 1);
    incoming.set(edge.reviewedGroupId, (incoming.get(edge.reviewedGroupId) ?? 0) + 1);
  }

  for (const id of groupIds) {
    if (outgoing.get(id) !== 2) {
      errors.push(`Le groupe ${id} doit reviewer 2 projets (reçu ${outgoing.get(id)}).`);
    }
    if (incoming.get(id) !== 2) {
      errors.push(`Le projet ${id} doit recevoir 2 reviews (reçu ${incoming.get(id)}).`);
    }
  }

  return errors;
}
