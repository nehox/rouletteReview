import Link from "next/link";
import { adminLogout } from "@/server/actions/auth";

const links = [
  { href: "/admin/dashboard", label: "Tableau de bord" },
  { href: "/admin/groupes", label: "Groupes" },
  { href: "/admin/tirage", label: "Tirage" },
  { href: "/admin/grille", label: "Grille review" },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/resultats", label: "Résultats" },
  { href: "/admin/journal", label: "Journal" },
];

export function AdminNav() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/dashboard" className="text-sm font-bold text-slate-900">
            Roulette<span className="text-brand-600">Review</span>
          </Link>
          <span className="badge bg-slate-900 text-white ring-slate-900">
            Admin
          </span>
        </div>
        <nav className="flex flex-wrap items-center gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            >
              {link.label}
            </Link>
          ))}
          <form action={adminLogout}>
            <button type="submit" className="btn-ghost px-2.5 py-1.5 text-xs">
              Déconnexion
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
