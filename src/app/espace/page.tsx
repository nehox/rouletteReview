import Link from "next/link";
import { redirect } from "next/navigation";
import { StudentNav } from "@/components/student-nav";
import { Alert, PhaseBadge, Progress, StatCard } from "@/components/ui";
import { PHASE_DESCRIPTIONS } from "@/lib/constants";
import { requireGroup } from "@/lib/auth";
import {
  getAssignmentsForReviewer,
  getGroupById,
  getGroupResult,
  getSettings,
} from "@/lib/data";
import { formatDate } from "@/lib/format";
import { formatNote } from "@/lib/scoring";
import { updateRepo } from "@/server/actions/auth";

export const dynamic = "force-dynamic";

export default async function EspacePage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const session = await requireGroup();
  const group = await getGroupById(session.groupId);
  if (!group) redirect("/");

  const [settings, params] = await Promise.all([getSettings(), searchParams]);
  const groupName = group.displayName ?? group.slotLabel;

  const canSeeAssignments =
    settings.phase === "REVIEWS" || settings.phase === "CLOSED";
  const assignments = canSeeAssignments
    ? await getAssignmentsForReviewer(group.id)
    : [];
  const submittedCount = assignments.filter(
    (entry) => entry.review?.status === "submitted",
  ).length;
  const result =
    settings.phase === "CLOSED" ? await getGroupResult(group.id) : null;

  return (
    <div className="min-h-screen">
      <StudentNav groupName={groupName} code={group.inviteCode} />
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Mon espace
          </h1>
          <PhaseBadge phase={settings.phase} />
        </div>
        <p className="text-sm text-slate-600">
          {PHASE_DESCRIPTIONS[settings.phase]}
        </p>

        {params.error ? <Alert kind="error">{params.error}</Alert> : null}
        {params.ok ? <Alert kind="success">{params.ok}</Alert> : null}

        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Groupe" value={groupName} hint={`Code ${group.inviteCode}`} />
          <StatCard
            label="Reviews à réaliser"
            value={assignments.length > 0 ? `${submittedCount}/${assignments.length}` : "—"}
            hint="Deux projets par groupe"
          />
          <StatCard
            label="Ma note"
            value={
              result && result.result.weightedScore !== null
                ? formatNote(result.result.weightedScore)
                : "—"
            }
            hint={
              result
                ? `${result.result.reviewCount} review(s) reçue(s)`
                : "Publiée à la clôture"
            }
          />
        </div>

        <section className="card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Mon dépôt</h2>
              <p className="mt-1 text-xs text-slate-500">
                Inscrit le {formatDate(group.registeredAt)}
              </p>
            </div>
            {group.repoUrl ? (
              <a
                href={group.repoUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary px-3 py-1.5 text-xs"
              >
                Ouvrir le dépôt
              </a>
            ) : null}
          </div>

          {group.repoUrl ? (
            <p className="mt-3 break-all rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
              {group.repoUrl}
            </p>
          ) : (
            <p className="mt-3 text-sm text-rose-600">Aucun dépôt enregistré.</p>
          )}

          {group.members.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {group.members.map((member) => (
                <span
                  key={member}
                  className="badge bg-slate-100 text-slate-600 ring-slate-200"
                >
                  {member}
                </span>
              ))}
            </div>
          ) : null}

          {settings.phase === "INSCRIPTIONS" ? (
            <form action={updateRepo} className="mt-4 flex flex-col gap-2 sm:flex-row">
              <input
                name="repoUrl"
                defaultValue={group.repoUrl ?? ""}
                className="input"
                placeholder="https://github.com/owner/repo"
                required
              />
              <button type="submit" className="btn-secondary whitespace-nowrap">
                Mettre à jour
              </button>
            </form>
          ) : (
            <p className="mt-4 text-xs text-slate-500">
              Le dépôt est verrouillé dès que les inscriptions sont fermées.
            </p>
          )}
        </section>

        {settings.phase === "DRAW" ? (
          <Alert kind="info">
            La roulette a été lancée. Les reviews vont bientôt s&apos;ouvrir :
            vous verrez ici les deux projets que vous devez évaluer.
          </Alert>
        ) : null}

        {settings.phase === "SETUP" ? (
          <Alert kind="warning">
            Les inscriptions ne sont pas ouvertes. Votre dépôt est enregistré et
            sera verrouillé au lancement du tirage.
          </Alert>
        ) : null}

        {settings.phase === "REVIEWS" ? (
          <section className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Projets à évaluer
                </h2>
                <p className="text-sm text-slate-600">
                  Remplissez la grille pour chacun des deux projets. Le brouillon
                  est sauvegardé automatiquement.
                </p>
              </div>
              <div className="w-full sm:w-56">
                <Progress
                  value={submittedCount}
                  max={Math.max(assignments.length, 1)}
                  label="Avancement"
                />
              </div>
            </div>

            {assignments.length === 0 ? (
              <Alert kind="warning">
                Aucune affectation trouvée. Contactez l&apos;administrateur.
              </Alert>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {assignments.map((entry) => {
                  const status = entry.review?.status ?? "todo";
                  return (
                    <div key={entry.assignment.id} className="card p-5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-bold text-slate-900">
                            {entry.reviewed.displayName ?? entry.reviewed.slotLabel}
                          </p>
                          {entry.reviewed.repoUrl ? (
                            <a
                              href={entry.reviewed.repoUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-0.5 block break-all text-xs text-brand-600 hover:underline"
                            >
                              {entry.reviewed.repoUrl.replace(
                                "https://github.com/",
                                "",
                              )}
                            </a>
                          ) : (
                            <p className="mt-0.5 text-xs text-rose-600">
                              Dépôt manquant
                            </p>
                          )}
                        </div>
                        <span
                          className={`badge ${
                            status === "submitted"
                              ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                              : status === "draft"
                                ? "bg-amber-50 text-amber-700 ring-amber-200"
                                : "bg-slate-100 text-slate-600 ring-slate-200"
                          }`}
                        >
                          {status === "submitted"
                            ? "Soumise"
                            : status === "draft"
                              ? "Brouillon"
                              : "À faire"}
                        </span>
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <span className="text-xs text-slate-500">
                          {status === "submitted" && entry.review?.weightedScore
                            ? `Note donnée : ${formatNote(entry.review.weightedScore)}`
                            : "Review anonyme"}
                        </span>
                        <Link
                          href={`/espace/review/${entry.assignment.id}`}
                          className="btn-primary px-3 py-1.5 text-xs"
                        >
                          {status === "submitted"
                            ? "Voir"
                            : status === "draft"
                              ? "Continuer"
                              : "Évaluer"}
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        ) : null}

        {settings.phase === "CLOSED" ? (
          <section className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Résultats disponibles
                </h2>
                <p className="text-sm text-slate-600">
                  Les reviews sont closes. Consultez votre note et les
                  commentaires anonymes reçus.
                </p>
              </div>
              <Link href="/espace/resultats" className="btn-primary">
                Voir mes résultats
              </Link>
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
