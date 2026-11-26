import { AdminNav } from "@/components/admin-nav";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { CriteriaEditor } from "@/components/criteria-editor";
import { Alert, PageHeader, PhaseBadge } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { criteriaFromSettings, weightPercent } from "@/lib/criteria";
import { getSettings } from "@/lib/data";
import { resetCriteria } from "@/server/actions/admin";

export const dynamic = "force-dynamic";

export default async function AdminCriteriaPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  await requireAdmin();
  const [settings, params] = await Promise.all([getSettings(), searchParams]);
  const criteria = criteriaFromSettings(settings);
  const editable =
    settings.phase === "SETUP" ||
    settings.phase === "INSCRIPTIONS" ||
    settings.phase === "DRAW";

  return (
    <div className="min-h-screen">
      <AdminNav />
      <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        <PageHeader
          title="Grille de review"
          subtitle="Personnalisez les critères, leur poids et les descriptions de chaque niveau."
          actions={<PhaseBadge phase={settings.phase} />}
        />

        {params.error ? <Alert kind="error">{params.error}</Alert> : null}
        {params.ok ? <Alert kind="success">{params.ok}</Alert> : null}

        {editable ? (
          <>
            <Alert kind="warning">
              Les changements s&apos;appliquent aux reviews non encore soumises.
              Les reviews déjà déposées ne sont pas recalculées.
            </Alert>

            <CriteriaEditor initialCriteria={criteria} />

            <section className="card flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Grille d&apos;origine
                </h2>
                <p className="hint">
                  Rétablit les six critères initiaux et leurs poids.
                </p>
              </div>
              <form action={resetCriteria}>
                <ConfirmSubmit
                  message="Rétablir la grille d'origine ? Vos modifications seront perdues."
                  className="btn-secondary px-3 py-1.5 text-xs"
                >
                  Restaurer
                </ConfirmSubmit>
              </form>
            </section>
          </>
        ) : (
          <>
            <Alert kind="warning">
              La grille est verrouillée pendant les phases de reviews et de
              résultats. Réouvrez les reviews pour la modifier.
            </Alert>
            <section className="card p-5">
              <h2 className="text-sm font-bold text-slate-900">
                Critères actuellement utilisés
              </h2>
              <ul className="mt-3 divide-y divide-slate-100">
                {criteria.map((criterion) => (
                  <li
                    key={criterion.key}
                    className="flex items-center justify-between gap-3 py-2 text-sm"
                  >
                    <span className="text-slate-700">
                      {criterion.label}
                      <span className="ml-1 text-xs text-slate-400">
                        ({criterion.shortLabel})
                      </span>
                    </span>
                    <span className="font-semibold text-slate-900">
                      {weightPercent(criterion)} %
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
