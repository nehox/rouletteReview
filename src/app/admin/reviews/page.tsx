import Link from "next/link";
import { AdminNav } from "@/components/admin-nav";
import { Alert, EmptyState, PageHeader, PhaseBadge, Progress, StatCard } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import {
  getAllAssignments,
  getSettings,
  getStats,
} from "@/lib/data";
import { formatDate } from "@/lib/format";
import { CRITERIA, formatNote, formatScore } from "@/lib/scoring";
import { reopenReview } from "@/server/actions/admin";

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  await requireAdmin();
  const [settings, stats, assignments, params] = await Promise.all([
    getSettings(),
    getStats(),
    getAllAssignments(),
    searchParams,
  ]);

  const expected = stats.registeredGroups * 2;
  const submitted = assignments.filter(
    (row) => row.review?.status === "submitted",
  ).length;

  return (
    <div className="min-h-screen">
      <AdminNav />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <PageHeader
          title="Suivi des reviews"
          subtitle="Vous voyez l'identité des reviewers ; les étudiants ne la voient jamais."
          actions={
            <>
              <PhaseBadge phase={settings.phase} />
              <a
                href="/api/export/reviews"
                download
                className="btn-secondary px-3 py-1.5 text-xs"
              >
                Export CSV
              </a>
            </>
          }
        />

        {params.error ? <Alert kind="error">{params.error}</Alert> : null}
        {params.ok ? <Alert kind="success">{params.ok}</Alert> : null}

        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Soumises"
            value={`${submitted}/${expected}`}
            hint="Reviews attendues"
          />
          <StatCard
            label="Brouillons"
            value={
              assignments.filter((row) => row.review?.status === "draft").length
            }
            hint="En cours de rédaction"
          />
          <StatCard
            label="Non commencées"
            value={assignments.filter((row) => !row.review).length}
            hint="Aucune sauvegarde"
          />
        </div>

        <div className="card p-5">
          <Progress
            value={submitted}
            max={Math.max(expected, 1)}
            label="Avancement global"
          />
        </div>

        {assignments.length === 0 ? (
          <EmptyState
            title="Aucune affectation"
            description="Le tirage n'a pas encore été lancé."
            action={
              <Link href="/admin/tirage" className="btn-primary">
                Aller au tirage
              </Link>
            }
          />
        ) : (
          <section className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Reviewer</th>
                    <th>Projet évalué</th>
                    <th>Statut</th>
                    <th>Note</th>
                    <th>Détail</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((row) => {
                    const status = row.review?.status ?? "todo";
                    return (
                      <tr key={row.assignment.id}>
                        <td className="font-semibold text-slate-900">
                          {row.reviewer.displayName ?? row.reviewer.slotLabel}
                        </td>
                        <td>
                          <p className="font-semibold text-slate-900">
                            {row.reviewed.displayName ?? row.reviewed.slotLabel}
                          </p>
                          {row.reviewed.repoUrl ? (
                            <a
                              href={row.reviewed.repoUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-brand-600 hover:underline"
                            >
                              {row.reviewed.repoUrl.replace(
                                "https://github.com/",
                                "",
                              )}
                            </a>
                          ) : null}
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              status === "submitted"
                                ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                                : status === "draft"
                                  ? "bg-amber-50 text-amber-700 ring-amber-200"
                                  : "bg-slate-100 text-slate-500 ring-slate-200"
                            }`}
                          >
                            {status === "submitted"
                              ? "Soumise"
                              : status === "draft"
                                ? "Brouillon"
                                : "À faire"}
                          </span>
                          <p className="mt-1 text-[10px] text-slate-400">
                            {formatDate(row.review?.submittedAt)}
                          </p>
                        </td>
                        <td className="font-semibold text-slate-900">
                          {formatNote(row.review?.weightedScore)}
                        </td>
                        <td>
                          <details>
                            <summary className="cursor-pointer text-xs font-semibold text-brand-600">
                              Voir
                            </summary>
                            <div className="mt-2 w-80 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                              {CRITERIA.map((criterion) => {
                                const score = row.review?.scores[criterion.key];
                                const comment =
                                  row.review?.criterionComments[criterion.key];
                                return (
                                  <div key={criterion.key}>
                                    <div className="flex justify-between text-xs">
                                      <span className="font-semibold text-slate-700">
                                        {criterion.shortLabel}
                                      </span>
                                      <span className="font-bold text-slate-900">
                                        {formatScore(score)}/10
                                      </span>
                                    </div>
                                    {comment ? (
                                      <p className="mt-0.5 whitespace-pre-line text-[11px] text-slate-600">
                                        {comment}
                                      </p>
                                    ) : null}
                                  </div>
                                );
                              })}
                              {row.review?.generalComment ? (
                                <div className="border-t border-slate-200 pt-2">
                                  <p className="text-[10px] font-semibold uppercase text-slate-500">
                                    Commentaire général
                                  </p>
                                  <p className="mt-1 whitespace-pre-line text-xs text-slate-700">
                                    {row.review.generalComment}
                                  </p>
                                </div>
                              ) : null}
                              {row.review?.status === "submitted" ? (
                                <form action={reopenReview} className="pt-1">
                                  <input
                                    type="hidden"
                                    name="reviewId"
                                    value={row.review.id}
                                  />
                                  <button
                                    type="submit"
                                    className="btn-secondary w-full px-2 py-1 text-[11px]"
                                  >
                                    Réouvrir pour modification
                                  </button>
                                </form>
                              ) : null}
                            </div>
                          </details>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
