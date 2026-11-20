import Link from "next/link";
import { redirect } from "next/navigation";
import { Alert } from "@/components/ui";
import { getSession } from "@/lib/session";
import { adminLogin } from "@/server/actions/auth";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const session = await getSession();
  if (session.role === "admin") redirect("/admin/dashboard");
  const params = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <p className="text-lg font-black text-white">
            Roulette<span className="text-brand-400">Review</span>
          </p>
          <p className="mt-1 text-xs uppercase tracking-widest text-slate-400">
            Administration
          </p>
        </div>

        <div className="card p-6">
          <h1 className="text-xl font-bold text-slate-900">Connexion admin</h1>
          <p className="mt-1 text-sm text-slate-600">
            Accès réservé à l&apos;enseignant responsable de la revue.
          </p>

          <div className="mt-4 space-y-3">
            {params.error ? <Alert kind="error">{params.error}</Alert> : null}
            {params.ok ? <Alert kind="success">{params.ok}</Alert> : null}
          </div>

          <form action={adminLogin} className="mt-5 space-y-4">
            <div>
              <label className="label" htmlFor="password">
                Mot de passe administrateur
              </label>
              <input
                id="password"
                name="password"
                type="password"
                className="input"
                autoComplete="current-password"
                required
                autoFocus
              />
            </div>
            <button type="submit" className="btn-primary w-full">
              Se connecter
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-500">
            <Link href="/" className="font-semibold text-brand-600 hover:underline">
              Retour à l&apos;accueil
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
