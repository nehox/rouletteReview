import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Roulette Review — revue de projets Swift",
  description:
    "Plateforme de revue croisée de projets étudiants : inscriptions, tirage au sort et grille d'évaluation.",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
