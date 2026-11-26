import { criteriaFromSettings } from "@/lib/criteria";
import { csvResponse, toCsv } from "@/lib/csv";
import {
  getAllAssignments,
  getGroups,
  getResults,
  getSettings,
} from "@/lib/data";
import { formatDate } from "@/lib/format";
import { formatScore } from "@/lib/scoring";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  submitted: "Soumise",
  draft: "Brouillon",
  todo: "À faire",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ type: string }> },
) {
  const session = await getSession();
  if (session.role !== "admin") {
    return new Response("Accès refusé.", { status: 401 });
  }

  const criteria = criteriaFromSettings(await getSettings());
  const { type } = await params;

  if (type === "groups") {
    const groups = await getGroups();
    const csv = toCsv(
      [
        "Emplacement",
        "Nom du groupe",
        "Code",
        "Statut",
        "Membres",
        "Dépôt GitHub",
        "Inscrit le",
      ],
      groups.map((group) => [
        group.slotLabel,
        group.displayName ?? "",
        group.inviteCode,
        group.status === "registered" ? "Inscrit" : "En attente",
        group.members.join(", "),
        group.repoUrl ?? "",
        group.registeredAt ? formatDate(group.registeredAt) : "",
      ]),
    );
    return csvResponse("groupes.csv", csv);
  }

  if (type === "assignments") {
    const assignments = await getAllAssignments();
    const csv = toCsv(
      [
        "Reviewer",
        "Projet évalué",
        "Dépôt",
        "Statut review",
        "Note /20",
        "Soumise le",
      ],
      assignments.map((row) => [
        row.reviewer.displayName ?? row.reviewer.slotLabel,
        row.reviewed.displayName ?? row.reviewed.slotLabel,
        row.reviewed.repoUrl ?? "",
        STATUS_LABELS[row.review?.status ?? "todo"],
        row.review?.weightedScore ?? "",
        row.review?.submittedAt ? formatDate(row.review.submittedAt) : "",
      ]),
    );
    return csvResponse("affectations.csv", csv);
  }

  if (type === "reviews") {
    const assignments = await getAllAssignments();
    const csv = toCsv(
      [
        "Reviewer",
        "Projet évalué",
        "Statut",
        ...criteria.map((criterion) => criterion.label),
        "Note /20",
        "Commentaire général",
        "Commentaires par critère",
        "Soumise le",
      ],
      assignments.map((row) => {
        const criterionComments = criteria.map((criterion) => {
          const comment = row.review?.criterionComments[criterion.key];
          return comment ? `${criterion.shortLabel}: ${comment}` : "";
        })
          .filter(Boolean)
          .join(" | ");
        return [
          row.reviewer.displayName ?? row.reviewer.slotLabel,
          row.reviewed.displayName ?? row.reviewed.slotLabel,
          STATUS_LABELS[row.review?.status ?? "todo"],
          ...criteria.map((criterion) =>
            formatScore(row.review?.scores[criterion.key]),
          ),
          row.review?.weightedScore ?? "",
          row.review?.generalComment ?? "",
          criterionComments,
          row.review?.submittedAt ? formatDate(row.review.submittedAt) : "",
        ];
      }),
    );
    return csvResponse("reviews.csv", csv);
  }

  if (type === "results") {
    const results = await getResults();
    const sorted = [...results].sort(
      (a, b) => (b.result.weightedScore ?? -1) - (a.result.weightedScore ?? -1),
    );
    const csv = toCsv(
      [
        "Projet",
        "Dépôt",
        "Reviews reçues",
        ...criteria.map((criterion) => criterion.label),
        "Note /20",
      ],
      sorted.map((entry) => [
        entry.group.displayName ?? entry.group.slotLabel,
        entry.group.repoUrl ?? "",
        entry.result.reviewCount,
        ...criteria.map((criterion) =>
          formatScore(entry.result.criteria[criterion.key]),
        ),
        entry.result.weightedScore ?? "",
      ]),
    );
    return csvResponse("resultats.csv", csv);
  }

  return new Response("Export inconnu.", { status: 404 });
}
