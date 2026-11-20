import Link from "next/link";
import { AdminNav } from "@/components/admin-nav";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { RouletteReveal } from "@/components/roulette-reveal";
import { Alert, EmptyState, PageHeader, PhaseBadge } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import {
  getAllAssignments,
  getGroups,
  getSettings,
} from "@/lib/data";
import { formatDate } from "@/lib/format";
import {
  launchDraw,
  openReviews,
  redraw,
} from "@/server/actions/admin";

export const dynamic = "force-dynamic";

export default async function AdminDrawPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  await requireAdmin();
  const [settings, groups, assignments, params] = await Promise.all([
    getSettings(),
    getGroups(),
    getAllAssignments(),
    searchParams,
  ]);

  const registered = groups.filter((group) => group.status === "registered");
  const allRegistered = groups.length > 0 && registered.length === groups.length;
  const canLaunch =
    (settings.phase === "SETUP" || settings.phase === "INSCRIPTIONS") &&
    allRegistered &&
    groups.length >= 4;
  const hasDraw = assignments.length > 0;

  const nameOf = (id: number) => {
    const group = groups.find((entry) => entry.id === id);
    return group?.displayName ?? group?.slotLabel ?? `Groupe ${id}`;
  };

  const revealRows = assignments.map((row) => ({
    reviewer: nameOf(row.assignment.reviewerGroupId),
    reviewed: nameOf(row.assignment.reviewedGroupId),
    repoUrl: row.reviewed.repoUrl,
  }));

  return (
    <div className="min-h-screen">
      <AdminNav />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <PageHeader
          title="Tirage au sort"
          subtitle="Chaque groupe review deux projets, et chaque projet est reviewé deux fois."
          actions={
            <>
              <PhaseBadge phase={settings.phase} />
              {hasDraw ? (
                <a
                  href="/api/export/assignments"
                  download
                  className="btn-secondary px-3 py-1.5 text-xs"
                >
                  Export CSV
                </a>
              ) : null}
            </>
          }
        />

        {params.error ? <Alert kind="error">{params.error}</Alert> : null}
        {params.ok ? <Alert kind="success">{params.ok}</Alert> : null}

        {!hasDraw ? (
          <section className="card space-y-4 p-6">
            <h2 className="text-lg font-bold text-slate-900">
              Lancer la roulette
            </h2>
            <p className="text-sm text-slate-600">
              {registered.length}/{groups.length} groupes inscrits. Le tirage
              garantit exactement deux reviews par groupe et par projet, sans
              auto-review.
            </p>

            {!allRegistered ? (
              <Alert kind="warning">
                Tous les groupes doivent être inscrits avant de lancer le tirage.{" "}
                <Link href="/admin/groupes" className="font-semibold underline">
                  Voir les groupes en attente
                </Link>
                .
              </Alert>
            ) : groups.length < 4 ? (
              <Alert kind="warning">
                Il faut au moins 4 groupes pour un tirage équitable.
              </Alert>
            ) : (
              <form action={launchDraw}>
                <ConfirmSubmit
                  className="btn-primary"
                  message="Lancer le tirage maintenant ? Les dépôts seront verrouillés."
                >
                  Lancer la roulette
                </ConfirmSubmit>
              </form>
            )}
          </section>
        ) : (
          <>
            <section className="card space-y-4 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Affectations
                  </h2>
                  <p className="text-xs text-slate-500">
                    Tirage du {formatDate(settings.drawAt)} · graine{" "}
                    <span className="font-mono">{settings.drawSeed ?? "—"}</span>
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {settings.phase === "DRAW" ? (
                    <form action={openReviews}>
                      <button type="submit" className="btn-primary px-3 py-1.5 text-xs">
                        Ouvrir les reviews
                      </button>
                    </form>
                  ) : null}
                  {settings.phase === "DRAW" ? (
                    <form action={redraw}>
                      <ConfirmSubmit
                        className="btn-secondary px-3 py-1.5 text-xs"
                        message="Re-tirer les affectations ? Le tirage actuel et les éventuels brouillons seront effacés."
                      >
                        Re-tirer
                      </ConfirmSubmit>
                    </form>
                  ) : null}
                </div>
              </div>

              <RouletteReveal rows={revealRows} />
            </section>

            <section className="card overflow-hidden">
              <div className="border-b border-slate-100 px-5 py-3">
                <h2 className="text-sm font-bold text-slate-900">
                  Matrice des affectations
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>Groupe reviewer</th>
                      <th>Projets à évaluer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map((group) => {
                      const targets = assignments.filter(
                        (row) => row.assignment.reviewerGroupId === group.id,
                      );
                      return (
                        <tr key={group.id}>
                          <td className="font-semibold text-slate-900">
                            {group.displayName ?? group.slotLabel}
                          </td>
                          <td>
                            <div className="flex flex-wrap gap-2">
                              {targets.length === 0 ? (
                                <span className="text-xs text-slate-400">—</span>
                              ) : (
                                targets.map((row) => (
                                  <a
                                    key={row.assignment.id}
                                    href={row.reviewed.repoUrl ?? "#"}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="badge bg-brand-50 text-brand-700 ring-brand-200 hover:bg-brand-100"
                                  >
                                    {row.reviewed.displayName ??
                                      row.reviewed.slotLabel}
                                  </a>
                                ))
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {settings.phase !== "DRAW" ? (
              <Alert kind="info">
                Le tirage est figé. Les reviews sont{" "}
                {settings.phase === "CLOSED" ? "closes" : "en cours"}.
              </Alert>
            ) : null}
          </>
        )}

        {!hasDraw && groups.length === 0 ? (
          <EmptyState
            title="Aucun groupe"
            description="Créez d'abord les groupes et ouvrez les inscriptions."
            action={
              <Link href="/admin/groupes" className="btn-primary">
                Gérer les groupes
              </Link>
            }
          />
        ) : null}
      </main>
    </div>
  );
}
