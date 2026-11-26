import Link from "next/link";
import { redirect } from "next/navigation";
import { StudentNav } from "@/components/student-nav";
import { Alert, PageHeader, PhaseBadge, Progress } from "@/components/ui";
import { requireGroup } from "@/lib/auth";
import { criteriaFromSettings } from "@/lib/criteria";
import { getGroupById, getGroupResult, getSettings } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { formatNote, formatScore } from "@/lib/scoring";

export const dynamic = "force-dynamic";

export default async function StudentResultsPage() {
  const session = await requireGroup();
  const group = await getGroupById(session.groupId);
  if (!group) redirect("/");

  const settings = await getSettings();
  const criteria = criteriaFromSettings(settings);
  const groupName = group.displayName ?? group.slotLabel;
  const published =
    settings.phase === "CLOSED" && settings.resultsPublishedAt !== null;

  const result = published ? await getGroupResult(group.id) : null;

  return (
    <div className="min-h-screen">
      <StudentNav groupName={groupName} code={group.inviteCode} />
      <main className="mx-auto max-w-4xl space-y-5 px-4 py-8">
        <PageHeader
          title="Mes résultats"
          subtitle="Retours anonymes des groupes qui ont évalué votre projet."
          actions={
            <>
              <PhaseBadge phase={settings.phase} />
              <Link href="/espace" className="btn-secondary px-3 py-1.5 text-xs">
                Retour
              </Link>
            </>
          }
        />

        {!published ? (
          <Alert kind="info">
            Les résultats ne sont pas encore publiés. Ils apparaîtront ici dès
            que l&apos;administrateur aura clôturé les reviews.
          </Alert>
        ) : !result || result.result.reviewCount === 0 ? (
          <Alert kind="warning">
            Aucune review n&apos;a été reçue pour votre projet. Contactez
            l&apos;administrateur.
          </Alert>
        ) : (
          <>
            <section className="card p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Note finale
                  </p>
                  <p className="text-4xl font-black text-slate-900">
                    {formatNote(result.result.weightedScore)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Moyenne de {result.result.reviewCount} review(s) anonyme(s).
                  </p>
                </div>
                <div className="w-full sm:w-72">
                  <div className="space-y-2">
                    {criteria.map((criterion) => {
                      const value = result.result.criteria[criterion.key];
                      return (
                        <div key={criterion.key}>
                          <div className="flex justify-between text-[11px] text-slate-500">
                            <span>{criterion.shortLabel}</span>
                            <span>{formatScore(value)}/10</span>
                          </div>
                          <Progress value={value ?? 0} max={10} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900">
                Commentaires reçus
              </h2>
              {result.reviews.map((review, index) => (
                <article key={index} className="card p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-bold text-slate-900">
                      Review anonyme {index + 1}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      {review.submittedAt
                        ? `Reçue le ${formatDate(review.submittedAt)}`
                        : null}
                      <span className="badge bg-brand-50 text-brand-700 ring-brand-200">
                        {formatNote(review.weightedScore)}
                      </span>
                    </div>
                  </div>

                  {review.generalComment ? (
                    <p className="mt-3 whitespace-pre-line rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                      {review.generalComment}
                    </p>
                  ) : null}

                  <details className="mt-3">
                    <summary className="cursor-pointer text-xs font-semibold text-brand-600">
                      Voir le détail par critère
                    </summary>
                    <div className="mt-2 space-y-2">
                      {criteria.map((criterion) => {
                        const score = review.scores[criterion.key];
                        const comment =
                          review.criterionComments[criterion.key];
                        return (
                          <div
                            key={criterion.key}
                            className="rounded-xl border border-slate-100 p-3"
                          >
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-semibold text-slate-700">
                                {criterion.label}
                              </p>
                              <p className="text-xs font-bold text-slate-900">
                                {formatScore(score)}/10
                              </p>
                            </div>
                            {comment ? (
                              <p className="mt-1 whitespace-pre-line text-xs text-slate-600">
                                {comment}
                              </p>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </details>
                </article>
              ))}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
