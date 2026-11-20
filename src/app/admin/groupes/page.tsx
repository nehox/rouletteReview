import Link from "next/link";
import { AdminNav } from "@/components/admin-nav";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { CopyButton } from "@/components/copy-button";
import { Alert, EmptyState, PageHeader, PhaseBadge } from "@/components/ui";
import { MAX_GROUPS, MIN_GROUPS } from "@/lib/constants";
import { requireAdmin } from "@/lib/auth";
import { getGroups, getSettings } from "@/lib/data";
import { formatDate } from "@/lib/format";
import {
  adminUpdateGroup,
  initializeGroups,
  regenerateInviteCode,
  resetEverything,
  resetGroupPassword,
  resetRegistration,
} from "@/server/actions/admin";

export const dynamic = "force-dynamic";

export default async function AdminGroupsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  await requireAdmin();
  const [settings, groups, params] = await Promise.all([
    getSettings(),
    getGroups(),
    searchParams,
  ]);

  return (
    <div className="min-h-screen">
      <AdminNav />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <PageHeader
          title="Groupes & inscriptions"
          subtitle="Créez les emplacements, distribuez les codes et suivez les dépôts."
          actions={
            <>
              <PhaseBadge phase={settings.phase} />
              <a
                href="/api/export/groups"
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

        {groups.length === 0 ? (
          <section className="card p-6">
            <h2 className="text-lg font-bold text-slate-900">
              Créer les groupes
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Choisissez le nombre d&apos;emplacements. Chaque groupe recevra un
              code d&apos;invitation unique.
            </p>
            <form action={initializeGroups} className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input
                type="number"
                name="numGroups"
                min={MIN_GROUPS}
                max={MAX_GROUPS}
                defaultValue={settings.numGroups}
                className="input sm:max-w-[160px]"
                required
              />
              <button type="submit" className="btn-primary">
                Générer les codes
              </button>
            </form>
            <p className="hint mt-2">
              Entre {MIN_GROUPS} et {MAX_GROUPS} groupes. Il faut au moins 4
              groupes inscrits pour lancer le tirage.
            </p>
          </section>
        ) : (
          <>
            <section className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>Groupe</th>
                      <th>Code</th>
                      <th>Dépôt GitHub</th>
                      <th>Statut</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map((group) => (
                      <tr key={group.id}>
                        <td>
                          <p className="font-semibold text-slate-900">
                            {group.displayName ?? group.slotLabel}
                          </p>
                          <p className="text-xs text-slate-500">
                            {group.slotLabel}
                          </p>
                          {group.members.length > 0 ? (
                            <p className="mt-1 text-xs text-slate-500">
                              {group.members.join(", ")}
                            </p>
                          ) : null}
                        </td>
                        <td>
                          <p className="font-mono text-xs font-semibold tracking-wider text-slate-800">
                            {group.inviteCode}
                          </p>
                          <div className="mt-1">
                            <CopyButton
                              path={`/inscription?code=${group.inviteCode}`}
                            />
                          </div>
                        </td>
                        <td className="max-w-[220px]">
                          {group.repoUrl ? (
                            <a
                              href={group.repoUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="break-all text-xs text-brand-600 hover:underline"
                            >
                              {group.repoUrl.replace("https://github.com/", "")}
                            </a>
                          ) : (
                            <span className="text-xs text-slate-400">
                              Non renseigné
                            </span>
                          )}
                          <p className="mt-1 text-[10px] text-slate-400">
                            Inscrit le {formatDate(group.registeredAt)}
                          </p>
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              group.status === "registered"
                                ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                                : "bg-slate-100 text-slate-500 ring-slate-200"
                            }`}
                          >
                            {group.status === "registered"
                              ? "Inscrit"
                              : "En attente"}
                          </span>
                        </td>
                        <td>
                          <details className="group">
                            <summary className="cursor-pointer text-xs font-semibold text-brand-600">
                              Gérer
                            </summary>
                            <div className="mt-3 w-72 space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                              <form action={adminUpdateGroup} className="space-y-2">
                                <input type="hidden" name="groupId" value={group.id} />
                                <p className="text-xs font-bold text-slate-700">
                                  Modifier le groupe
                                </p>
                                <input
                                  name="displayName"
                                  defaultValue={group.displayName ?? ""}
                                  placeholder="Nom du groupe"
                                  className="input"
                                />
                                <input
                                  name="members"
                                  defaultValue={group.members.join(", ")}
                                  placeholder="Membres"
                                  className="input"
                                />
                                <input
                                  name="repoUrl"
                                  defaultValue={group.repoUrl ?? ""}
                                  placeholder="https://github.com/owner/repo"
                                  className="input"
                                />
                                <button
                                  type="submit"
                                  className="btn-secondary w-full px-3 py-1.5 text-xs"
                                >
                                  Enregistrer
                                </button>
                              </form>

                              <form action={resetGroupPassword} className="space-y-2">
                                <input type="hidden" name="groupId" value={group.id} />
                                <p className="text-xs font-bold text-slate-700">
                                  Réinitialiser le mot de passe
                                </p>
                                <input
                                  name="password"
                                  type="text"
                                  minLength={8}
                                  placeholder="Nouveau mot de passe"
                                  className="input"
                                  required
                                />
                                <button
                                  type="submit"
                                  className="btn-secondary w-full px-3 py-1.5 text-xs"
                                >
                                  Définir
                                </button>
                              </form>

                              <form action={regenerateInviteCode}>
                                <input type="hidden" name="groupId" value={group.id} />
                                <button
                                  type="submit"
                                  className="btn-secondary w-full px-3 py-1.5 text-xs"
                                >
                                  Régénérer le code
                                </button>
                              </form>

                              <form action={resetRegistration}>
                                <input type="hidden" name="groupId" value={group.id} />
                                <ConfirmSubmit
                                  className="btn-danger w-full px-3 py-1.5 text-xs"
                                  message="Effacer l'inscription de ce groupe (mot de passe, dépôt, membres) ?"
                                >
                                  Réinitialiser l&apos;inscription
                                </ConfirmSubmit>
                              </form>
                            </div>
                          </details>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="card border-rose-200 p-5">
              <h2 className="text-sm font-bold text-rose-700">
                Zone de réinitialisation
              </h2>
              <p className="mt-1 text-xs text-slate-600">
                Efface tous les groupes, le tirage, les reviews et le journal.
                Les codes d&apos;invitation seront recréés. Action irréversible.
              </p>
              <form
                action={resetEverything}
                className="mt-3 flex flex-col gap-2 sm:flex-row"
              >
                <input
                  name="confirm"
                  placeholder="Tapez REINITIALISER"
                  className="input sm:max-w-[220px]"
                  required
                />
                <ConfirmSubmit
                  className="btn-danger"
                  message="Effacer TOUTES les données de la plateforme ? Cette action est irréversible."
                >
                  Tout réinitialiser
                </ConfirmSubmit>
              </form>
            </section>
          </>
        )}

        {groups.length > 0 ? (
          <p className="text-center text-xs text-slate-500">
            Besoin de modifier le nombre de groupes ? Passez par la
            réinitialisation complète, puis recréez les groupes.{" "}
            <Link href="/admin/dashboard" className="font-semibold text-brand-600">
              Retour au tableau de bord
            </Link>
          </p>
        ) : null}

        {groups.length === 0 ? (
          <EmptyState
            title="Les codes seront affichés ici"
            description="Une fois les groupes créés, vous pourrez copier les liens d'invitation et suivre chaque inscription."
          />
        ) : null}
      </main>
    </div>
  );
}
