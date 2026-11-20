import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ReviewForm } from "@/components/review-form";
import { StudentNav } from "@/components/student-nav";
import { Alert, PageHeader, PhaseBadge } from "@/components/ui";
import { requireGroup } from "@/lib/auth";
import {
  getAssignmentForReviewer,
  getGroupById,
  getSettings,
} from "@/lib/data";
import { formatDate } from "@/lib/format";
import { CRITERIA, formatNote, formatScore } from "@/lib/scoring";

export const dynamic = "force-dynamic";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireGroup();
  const group = await getGroupById(session.groupId);
  if (!group) redirect("/");

  const { id } = await params;
  const assignmentId = Number.parseInt(id, 10);
  if (!Number.isInteger(assignmentId)) notFound();

  const [settings, assignment] = await Promise.all([
    getSettings(),
    getAssignmentForReviewer(assignmentId, session.groupId),
  ]);
  if (!assignment) notFound();

  const groupName = group.displayName ?? group.slotLabel;
  const reviewedName =
    assignment.reviewed.displayName ?? assignment.reviewed.slotLabel;
  const submitted = assignment.review?.status === "submitted";
  const editable = settings.phase === "REVIEWS" && !submitted;

  return (
    <div className="min-h-screen">
      <StudentNav groupName={groupName} code={group.inviteCode} />
      <main className="mx-auto max-w-3xl space-y-5 px-4 py-8">
        <PageHeader
          title="Grille d'évaluation"
          subtitle="Notez chaque critère de 0 à 10. Les notes sont pondérées pour obtenir une note sur 20."
          actions={
            <>
              <PhaseBadge phase={settings.phase} />
              <Link href="/espace" className="btn-secondary px-3 py-1.5 text-xs">
                Retour
              </Link>
            </>
          }
        />

        {settings.phase === "CLOSED" && !submitted ? (
          <Alert kind="warning">
            Les reviews sont closes et cette évaluation n&apos;a pas été soumise.
            Contactez l&apos;administrateur si vous pensez qu&apos;il s&apos;agit
            d&apos;une erreur.
          </Alert>
        ) : null}

        {settings.phase !== "REVIEWS" && settings.phase !== "CLOSED" ? (
          <Alert kind="info">
            La phase de reviews n&apos;est pas ouverte. Revenez lorsque
            l&apos;administrateur l&apos;aura lancée.
          </Alert>
        ) : null}

        {submitted && assignment.review ? (
          <div className="space-y-4">
            <Alert kind="success">
              Review soumise le {formatDate(assignment.review.submittedAt)}. Elle
              n&apos;est plus modifiable.
            </Alert>

            <div className="card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Projet évalué
                  </p>
                  <p className="text-lg font-bold text-slate-900">
                    {reviewedName}
                  </p>
                </div>
                <div className="rounded-xl bg-brand-50 px-4 py-2 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-700">
                    Note donnée
                  </p>
                  <p className="text-lg font-black text-brand-700">
                    {formatNote(assignment.review.weightedScore)}
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {CRITERIA.map((criterion) => {
                  const score = assignment.review?.scores[criterion.key];
                  const comment =
                    assignment.review?.criterionComments[criterion.key];
                  return (
                    <div
                      key={criterion.key}
                      className="rounded-xl border border-slate-100 p-3"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-800">
                          {criterion.label}
                        </p>
                        <p className="text-sm font-bold text-slate-900">
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

              {assignment.review.generalComment ? (
                <div className="mt-4 rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Commentaire général
                  </p>
                  <p className="mt-1 whitespace-pre-line text-sm text-slate-700">
                    {assignment.review.generalComment}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        ) : editable ? (
          <ReviewForm
            assignmentId={assignment.assignment.id}
            reviewedName={reviewedName}
            repoUrl={assignment.reviewed.repoUrl}
            initialScores={assignment.review?.scores ?? {}}
            initialComments={assignment.review?.criterionComments ?? {}}
            initialGeneralComment={assignment.review?.generalComment ?? ""}
          />
        ) : null}
      </main>
    </div>
  );
}
