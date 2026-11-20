import Link from "next/link";
import { redirect } from "next/navigation";
import { Alert, PhaseBadge } from "@/components/ui";
import { PHASE_DESCRIPTIONS } from "@/lib/constants";
import { getSettings } from "@/lib/data";
import { getSession } from "@/lib/session";
import { groupLogin } from "@/server/actions/auth";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string; code?: string }>;
}) {
  const session = await getSession();
  if (session.role === "admin") redirect("/admin/dashboard");
  if (session.role === "group") redirect("/espace");

  const [settings, params] = await Promise.all([getSettings(), searchParams]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-brand-50 via-slate-50 to-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-12">
        <header className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-lg font-black tracking-tight text-slate-900">
              Roulette<span className="text-brand-600">Review</span>
            </span>
            <PhaseBadge phase={settings.phase} />
          </div>
          <h1 className="max-w-2xl text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            Évaluez deux projets. Faites évaluer le vôtre.
          </h1>
          <p className="max-w-2xl text-sm text-slate-600">
            Revue croisée de projets Swift : chaque groupe dépose son dépôt
            GitHub, la roulette attribue deux projets à reviewer, puis chacun
            remplit une grille bienveillante.
          </p>
          <p className="text-xs text-slate-500">
            {PHASE_DESCRIPTIONS[settings.phase]}
          </p>
        </header>

        {params.error ? <Alert kind="error">{params.error}</Alert> : null}
        {params.ok ? <Alert kind="success">{params.ok}</Alert> : null}

        <div className="grid gap-5 md:grid-cols-[1.4fr_1fr]">
          <section className="card p-6">
            <h2 className="text-lg font-bold text-slate-900">Espace étudiant</h2>
            <p className="mt-1 text-sm text-slate-600">
              Connectez-vous avec le code fourni par votre enseignant et le mot
              de passe choisi à l&apos;inscription.
            </p>

            <form action={groupLogin} className="mt-5 space-y-4">
              <div>
                <label className="label" htmlFor="code">
                  Code de groupe
                </label>
                <input
                  id="code"
                  name="code"
                  defaultValue={params.code ?? ""}
                  className="input uppercase tracking-widest"
                  placeholder="ABCD2345"
                  autoComplete="username"
                  required
                />
              </div>
              <div>
                <label className="label" htmlFor="password">
                  Mot de passe
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  className="input"
                  autoComplete="current-password"
                  required
                />
              </div>
              <button type="submit" className="btn-primary w-full">
                Se connecter
              </button>
            </form>

            <div className="mt-5 border-t border-slate-100 pt-4 text-sm text-slate-600">
              Pas encore inscrit ?{" "}
              <Link
                href="/inscription"
                className="font-semibold text-brand-600 hover:underline"
              >
                Utilisez votre code d&apos;invitation
              </Link>
              .
            </div>

            {settings.phase === "SETUP" ? (
              <div className="mt-4">
                <Alert kind="warning">
                  Les inscriptions ne sont pas encore ouvertes. Vous pouvez
                  revenir un peu plus tard.
                </Alert>
              </div>
            ) : null}
          </section>

          <section className="card flex flex-col justify-between p-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Espace administrateur
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Suivi des inscriptions, lancement de la roulette, avancement des
                reviews et résultats.
              </p>
            </div>
            <Link href="/admin" className="btn-secondary mt-6 w-full">
              Accéder à l&apos;administration
            </Link>
          </section>
        </div>

        <footer className="text-center text-xs text-slate-400">
          Revue croisée de projets Swift — les reviews sont anonymes et les
          dépôts verrouillés après le tirage.
        </footer>
      </div>
    </main>
  );
}
