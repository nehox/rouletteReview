import Link from "next/link";
import { AdminNav } from "@/components/admin-nav";
import { ConfirmSubmit } from "@/components/confirm-submit";
import {
  Alert,
  PageHeader,
  PhaseBadge,
  Progress,
  StatCard,
} from "@/components/ui";
import { PHASE_DESCRIPTIONS } from "@/lib/constants";
import { requireAdmin } from "@/lib/auth";
import { getGroups, getSettings, getStats } from "@/lib/data";
import { formatDate } from "@/lib/format";
import {
  closeInscriptions,
  closeReviews,
  launchDraw,
  openInscriptions,
  openReviews,
  reopenReviews,
} from "@/server/actions/admin";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  await requireAdmin();
  const [settings, stats, groups, params] = await Promise.all([
    getSettings(),
    getStats(),
    getGroups(),
    searchParams,
  ]);

  const allRegistered =
    stats.totalGroups > 0 && stats.registeredGroups === stats.totalGroups;
  const expectedReviews = stats.registeredGroups * 2;

  return (
    <div className="min-h-screen">
      <AdminNav />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <PageHeader
          title="Tableau de bord"
          subtitle={PHASE_DESCRIPTIONS[settings.phase]}
          actions={<PhaseBadge phase={settings.phase} />}
        />

        {params.error ? <Alert kind="error">{params.error}</Alert> : null}
        {params.ok ? <Alert kind="success">{params.ok}</Alert> : null}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Groupes"
            value={`${stats.registeredGroups}/${stats.totalGroups}`}
            hint="Inscrits / créés"
          />
          <StatCard
            label="Reviews soumises"
            value={`${stats.submittedReviews}/${expectedReviews}`}
            hint="Attendues : 2 par groupe"
          />
          <StatCard
            label="Tirage"
            value={settings.drawAt ? "Effectué" : "En attente"}
            hint={settings.drawAt ? formatDate(settings.drawAt) : undefined}
          />
          <StatCard
            label="Clôture"
            value={settings.reviewsClosedAt ? "Close" : "Ouverte"}
            hint={
              settings.reviewsClosedAt
                ? formatDate(settings.reviewsClosedAt)
                : undefined
            }
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <section className="card space-y-4 p-5">
            <h2 className="text-sm font-bold text-slate-900">Progression</h2>
            <Progress
              value={stats.registeredGroups}
              max={Math.max(stats.totalGroups, 1)}
              label="Inscriptions"
            />
            <Progress
              value={stats.submittedReviews}
              max={Math.max(expectedReviews, 1)}
              label="Reviews soumises"
            />

            <div className="border-t border-slate-100 pt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Actions disponibles
              </h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {settings.phase === "SETUP" ? (
                  <>
                    {stats.totalGroups === 0 ? (
                      <Link href="/admin/groupes" className="btn-primary">
                        Créer les groupes
                      </Link>
                    ) : (
                      <form action={openInscriptions}>
                        <button type="submit" className="btn-primary">
                          Ouvrir les inscriptions
                        </button>
                      </form>
                    )}
                    {allRegistered ? (
                      <form action={launchDraw}>
                        <button type="submit" className="btn-secondary">
                          Lancer la roulette
                        </button>
                      </form>
                    ) : null}
                  </>
                ) : null}

                {settings.phase === "INSCRIPTIONS" ? (
                  <>
                    <form action={closeInscriptions}>
                      <button type="submit" className="btn-secondary">
                        Fermer les inscriptions
                      </button>
                    </form>
                    {allRegistered ? (
                      <form action={launchDraw}>
                        <button type="submit" className="btn-primary">
                          Lancer la roulette
                        </button>
                      </form>
                    ) : (
                      <Link href="/admin/groupes" className="btn-secondary">
                        Voir les groupes en attente
                      </Link>
                    )}
                  </>
                ) : null}

                {settings.phase === "DRAW" ? (
                  <>
                    <Link href="/admin/tirage" className="btn-secondary">
                      Voir le tirage
                    </Link>
                    <form action={openReviews}>
                      <button type="submit" className="btn-primary">
                        Ouvrir les reviews
                      </button>
                    </form>
                  </>
                ) : null}

                {settings.phase === "REVIEWS" ? (
                  <>
                    <Link href="/admin/reviews" className="btn-secondary">
                      Suivre les reviews
                    </Link>
                    <form action={closeReviews}>
                      <ConfirmSubmit
                        className="btn-primary"
                        message="Clôturer les reviews et publier les résultats aux étudiants ?"
                      >
                        Clôturer et publier
                      </ConfirmSubmit>
                    </form>
                  </>
                ) : null}

                {settings.phase === "CLOSED" ? (
                  <>
                    <Link href="/admin/resultats" className="btn-primary">
                      Voir les résultats
                    </Link>
                    <form action={reopenReviews}>
                      <ConfirmSubmit
                        className="btn-secondary"
                        message="Réouvrir la phase de reviews ? Les résultats seront masqués aux étudiants."
                      >
                        Réouvrir les reviews
                      </ConfirmSubmit>
                    </form>
                  </>
                ) : null}
              </div>
            </div>
          </section>

          <section className="card p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">Groupes</h2>
              <Link
                href="/admin/groupes"
                className="text-xs font-semibold text-brand-600 hover:underline"
              >
                Gérer
              </Link>
            </div>
            <div className="mt-3 space-y-2">
              {groups.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Aucun groupe créé pour le moment.
                </p>
              ) : (
                groups.map((group) => (
                  <div
                    key={group.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {group.displayName ?? group.slotLabel}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {group.repoUrl ?? "Dépôt non renseigné"}
                      </p>
                    </div>
                    <span
                      className={`badge shrink-0 ${
                        group.status === "registered"
                          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                          : "bg-slate-100 text-slate-500 ring-slate-200"
                      }`}
                    >
                      {group.status === "registered" ? "Inscrit" : "En attente"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
