import { AdminNav } from "@/components/admin-nav";
import { EmptyState, PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { getAuditEntries, getGroups } from "@/lib/data";
import { formatDate } from "@/lib/format";

const ACTION_LABELS: Record<string, string> = {
  "admin.login": "Connexion admin",
  "admin.reset": "Réinitialisation complète",
  "admin.groups.initialize": "Création des groupes",
  "admin.phase.open_inscriptions": "Ouverture des inscriptions",
  "admin.phase.close_inscriptions": "Fermeture des inscriptions",
  "admin.phase.open_reviews": "Ouverture des reviews",
  "admin.phase.close_reviews": "Clôture des reviews",
  "admin.phase.reopen_reviews": "Réouverture des reviews",
  "admin.draw.launch": "Lancement du tirage",
  "admin.draw.redraw": "Nouveau tirage",
  "admin.group.update": "Modification d'un groupe",
  "admin.group.password_reset": "Réinitialisation de mot de passe",
  "admin.group.code_regenerate": "Régénération d'un code",
  "admin.group.registration_reset": "Réinitialisation d'inscription",
  "admin.review.reopen": "Réouverture d'une review",
  "admin.criteria.update": "Modification de la grille",
  "admin.criteria.reset": "Restauration de la grille",
  "group.login": "Connexion d'un groupe",
  "group.register": "Inscription d'un groupe",
  "group.repo.update": "Mise à jour du dépôt",
  "group.review.submit": "Review soumise",
};

export const dynamic = "force-dynamic";

export default async function AdminJournalPage() {
  await requireAdmin();
  const [entries, groups] = await Promise.all([
    getAuditEntries(300),
    getGroups(),
  ]);
  const groupNames = new Map(
    groups.map((group) => [group.id, group.displayName ?? group.slotLabel]),
  );

  return (
    <div className="min-h-screen">
      <AdminNav />
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <PageHeader
          title="Journal d'activité"
          subtitle="Historique des actions sensibles : connexions, phases, tirage et soumissions."
        />

        {entries.length === 0 ? (
          <EmptyState
            title="Aucune activité"
            description="Les actions apparaîtront ici au fur et à mesure."
          />
        ) : (
          <section className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Acteur</th>
                    <th>Action</th>
                    <th>Détails</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id}>
                      <td className="whitespace-nowrap text-xs text-slate-500">
                        {formatDate(entry.createdAt)}
                      </td>
                      <td className="text-xs text-slate-700">
                        {entry.actorType === "admin"
                          ? "Admin"
                          : entry.actorType === "group"
                            ? (groupNames.get(entry.actorId ?? -1) ??
                              `Groupe ${entry.actorId}`)
                            : "Système"}
                      </td>
                      <td className="text-sm font-semibold text-slate-900">
                        {ACTION_LABELS[entry.action] ?? entry.action}
                      </td>
                      <td className="max-w-[280px]">
                        <pre className="whitespace-pre-wrap break-all text-[11px] text-slate-500">
                          {Object.keys(entry.details).length > 0
                            ? JSON.stringify(entry.details, null, 1)
                            : "—"}
                        </pre>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
