import Link from "next/link";
import { groupLogout } from "@/server/actions/auth";

export function StudentNav({
  groupName,
  code,
}: {
  groupName: string;
  code: string;
}) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/espace" className="text-sm font-bold text-slate-900">
            Roulette<span className="text-brand-600">Review</span>
          </Link>
          <span className="badge bg-brand-50 text-brand-700 ring-brand-200">
            {groupName}
          </span>
          <span className="hidden text-xs text-slate-400 sm:inline">
            code {code}
          </span>
        </div>
        <nav className="flex items-center gap-1">
          <Link
            href="/espace"
            className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            Mon espace
          </Link>
          <Link
            href="/espace/resultats"
            className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            Résultats
          </Link>
          <form action={groupLogout}>
            <button type="submit" className="btn-ghost px-2.5 py-1.5 text-xs">
              Déconnexion
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
