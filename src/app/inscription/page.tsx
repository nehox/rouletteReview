import Link from "next/link";
import { redirect } from "next/navigation";
import { Alert, PhaseBadge } from "@/components/ui";
import { getGroupByCode, getSettings } from "@/lib/data";
import { getSession } from "@/lib/session";
import { registerGroup } from "@/server/actions/auth";

export const dynamic = "force-dynamic";

export default async function InscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; error?: string }>;
}) {
  const session = await getSession();
  if (session.role === "group") redirect("/espace");
  if (session.role === "admin") redirect("/admin/dashboard");

  const params = await searchParams;
  const code = (params.code ?? "").trim().toUpperCase();
  const [settings, group] = await Promise.all([
    getSettings(),
    code ? getGroupByCode(code) : Promise.resolve(undefined),
  ]);

  const closed = settings.phase !== "INSCRIPTIONS";
  const alreadyRegistered = group?.status === "registered";

  return (
    <main className="min-h-screen bg-gradient-to-b from-brand-50 via-slate-50 to-white">
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/" className="text-sm font-black text-slate-900">
            Roulette<span className="text-brand-600">Review</span>
          </Link>
          <PhaseBadge phase={settings.phase} />
        </div>

        <div className="card p-6">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Inscription du groupe
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Renseignez votre code d&apos;invitation, choisissez un mot de passe
            et déposez le lien GitHub de votre projet Swift.
          </p>

          <div className="mt-4 space-y-3">
            {params.error ? <Alert kind="error">{params.error}</Alert> : null}
            {alreadyRegistered ? (
              <Alert kind="info">
                Ce groupe est déjà inscrit.{" "}
                <Link href="/" className="font-semibold underline">
                  Connectez-vous
                </Link>
                .
              </Alert>
            ) : null}
            {closed && !alreadyRegistered ? (
              <Alert kind="warning">
                Les inscriptions sont actuellement fermées. Revenez lorsque
                votre enseignant les aura ouvertes.
              </Alert>
            ) : null}
            {group ? (
              <Alert kind="info">
                Emplacement associé : <strong>{group.slotLabel}</strong>
              </Alert>
            ) : code ? (
              <Alert kind="error">Code d&apos;invitation inconnu.</Alert>
            ) : null}
          </div>

          {!alreadyRegistered ? (
            <form
              action={registerGroup}
              className={`mt-6 space-y-4 ${closed ? "opacity-60" : ""}`}
            >
              <div>
                <label className="label" htmlFor="code">
                  Code d&apos;invitation <span className="text-rose-600">*</span>
                </label>
                <input
                  id="code"
                  name="code"
                  defaultValue={code}
                  className="input uppercase tracking-widest"
                  placeholder="ABCD2345"
                  required
                />
              </div>

              <div>
                <label className="label" htmlFor="displayName">
                  Nom du groupe <span className="text-rose-600">*</span>
                </label>
                <input
                  id="displayName"
                  name="displayName"
                  className="input"
                  placeholder="Les Swifters"
                  required
                />
              </div>

              <div>
                <label className="label" htmlFor="members">
                  Membres du groupe
                </label>
                <textarea
                  id="members"
                  name="members"
                  rows={2}
                  className="input"
                  placeholder="Alice, Bob, Chloé"
                />
                <p className="hint mt-1">Séparés par des virgules.</p>
              </div>

              <div>
                <label className="label" htmlFor="repoUrl">
                  Dépôt GitHub <span className="text-rose-600">*</span>
                </label>
                <input
                  id="repoUrl"
                  name="repoUrl"
                  className="input"
                  placeholder="https://github.com/owner/projet"
                  required
                />
                <p className="hint mt-1">
                  Format attendu : github.com/owner/repo. Le dépôt doit être
                  accessible par les autres groupes.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="password">
                    Mot de passe <span className="text-rose-600">*</span>
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    className="input"
                    minLength={8}
                    autoComplete="new-password"
                    required
                  />
                  <p className="hint mt-1">8 caractères minimum.</p>
                </div>
                <div>
                  <label className="label" htmlFor="confirmPassword">
                    Confirmation <span className="text-rose-600">*</span>
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    className="input"
                    minLength={8}
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn-primary w-full"
                disabled={closed || !group}
              >
                Valider l&apos;inscription
              </button>
            </form>
          ) : null}

          <p className="mt-6 text-center text-xs text-slate-500">
            Déjà inscrit ?{" "}
            <Link href="/" className="font-semibold text-brand-600 hover:underline">
              Connectez-vous ici
            </Link>
            .
          </p>
        </div>
      </div>
    </main>
  );
}
