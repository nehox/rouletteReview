import Link from "next/link";
import { AdminNav } from "@/components/admin-nav";
import { Alert, EmptyState, PageHeader, PhaseBadge, StatCard } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { getResults, getSettings } from "@/lib/data";
import { CRITERIA, formatNote, formatScore } from "@/lib/scoring";

export const dynamic = "force-dynamic";

export default async function AdminResultsPage() {
  await requireAdmin();
  const [settings, results] = await Promise.all([getSettings(), getResults()]);

  const sorted = [...results].sort(
    (a, b) =>
      (b.result.weightedScore ?? -1) - (a.result.weightedScore ?? -1),
  );
  const reviewed = results.filter((entry) => entry.result.reviewCount > 0);
  const averageOfAverages =
    reviewed.length > 0
      ? reviewed.reduce(
          (sum, entry) => sum + (entry.result.weightedScore ?? 0),
          0,
        ) / reviewed.length
      : null;

  return (
    <div className="min-h-screen">
      <AdminNav />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <PageHeader
          title="Résultats"
          subtitle="Moyenne des reviews soumises pour chaque projet, avec le détail par critère."
          actions={
            <>
              <PhaseBadge phase={settings.phase} />
              <a
                href="/api/export/results"
                download
                className="btn-secondary px-3 py-1.5 text-xs"
              >
                Export CSV
              </a>
            </>
          }
        />

        {settings.phase !== "CLOSED" ? (
          <Alert kind="warning">
            Aperçu administrateur : les résultats ne sont pas encore publiés aux
            étudiants. Ils le seront à la clôture des reviews.
          </Alert>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Projets évalués" value={reviewed.length} />
          <StatCard
            label="Reviews reçues"
            value={results.reduce(
              (sum, entry) => sum + entry.result.reviewCount,
              0,
            )}
          />
          <StatCard
            label="Moyenne de classe"
            value={formatNote(averageOfAverages)}
          />
        </div>

        {results.length === 0 ? (
          <EmptyState
            title="Aucun résultat"
            description="Les groupes et le tirage n'ont pas encore été configurés."
            action={
              <Link href="/admin/groupes" className="btn-primary">
                Gérer les groupes
              </Link>
            }
          />
        ) : (
          <section className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Projet</th>
                    <th>Reviews</th>
                    {CRITERIA.map((criterion) => (
                      <th key={criterion.key}>{criterion.shortLabel}</th>
                    ))}
                    <th>Note /20</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((entry, index) => (
                    <tr key={entry.group.id}>
                      <td className="font-semibold text-slate-500">
                        {entry.result.weightedScore !== null ? index + 1 : "—"}
                      </td>
                      <td>
                        <p className="font-semibold text-slate-900">
                          {entry.group.displayName ?? entry.group.slotLabel}
                        </p>
                        {entry.group.repoUrl ? (
                          <a
                            href={entry.group.repoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-brand-600 hover:underline"
                          >
                            {entry.group.repoUrl.replace(
                              "https://github.com/",
                              "",
                            )}
                          </a>
                        ) : (
                          <span className="text-xs text-slate-400">
                            Dépôt non renseigné
                          </span>
                        )}
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            entry.result.reviewCount === 2
                              ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                              : entry.result.reviewCount === 1
                                ? "bg-amber-50 text-amber-700 ring-amber-200"
                                : "bg-rose-50 text-rose-700 ring-rose-200"
                          }`}
                        >
                          {entry.result.reviewCount}/2
                        </span>
                      </td>
                      {CRITERIA.map((criterion) => (
                        <td key={criterion.key} className="text-slate-700">
                          {formatScore(entry.result.criteria[criterion.key])}
                        </td>
                      ))}
                      <td className="font-bold text-slate-900">
                        {formatNote(entry.result.weightedScore)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <p className="text-center text-xs text-slate-500">
          Les reviews reçues sont visibles dans le détail sur la page{" "}
          <Link href="/admin/reviews" className="font-semibold text-brand-600">
            Suivi des reviews
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
