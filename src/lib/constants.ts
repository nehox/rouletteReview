import type { Phase } from "@/db";

export const PHASE_LABELS: Record<Phase, string> = {
  SETUP: "Préparation",
  INSCRIPTIONS: "Inscriptions ouvertes",
  DRAW: "Tirage effectué",
  REVIEWS: "Reviews en cours",
  CLOSED: "Clôturé",
};

export const PHASE_DESCRIPTIONS: Record<Phase, string> = {
  SETUP:
    "Configurez les groupes puis ouvrez les inscriptions. Les groupes peuvent encore être modifiés.",
  INSCRIPTIONS:
    "Les groupes s'inscrivent et déposent leur lien GitHub. Vous pouvez fermer les inscriptions à tout moment.",
  DRAW:
    "Le tirage est figé. Vérifiez les affectations, puis ouvrez la phase de reviews.",
  REVIEWS:
    "Chaque groupe évalue les deux projets qui lui ont été attribués. Les dépôts sont verrouillés.",
  CLOSED:
    "Les reviews sont closes. Les notes et commentaires anonymes sont visibles par les groupes.",
};

export const PHASE_ORDER: Phase[] = [
  "SETUP",
  "INSCRIPTIONS",
  "DRAW",
  "REVIEWS",
  "CLOSED",
];

export const PHASE_BADGE_CLASSES: Record<Phase, string> = {
  SETUP: "bg-slate-100 text-slate-700 ring-slate-200",
  INSCRIPTIONS: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  DRAW: "bg-amber-50 text-amber-700 ring-amber-200",
  REVIEWS: "bg-brand-50 text-brand-700 ring-brand-200",
  CLOSED: "bg-slate-800 text-white ring-slate-800",
};

export const MIN_GROUPS = 4;
export const MAX_GROUPS = 30;
