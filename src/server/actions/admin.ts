"use server";

import { count, eq, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import {
  assignments,
  auditLog,
  db,
  groups,
  reviews,
  settings,
} from "@/db";
import { logAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth";
import { generateDrawSeed, generateInviteCode } from "@/lib/codes";
import { MAX_GROUPS, MIN_GROUPS } from "@/lib/constants";
import {
  getGroupById,
  getGroups,
  getSettings,
} from "@/lib/data";
import { generateDraw } from "@/lib/draw";
import { normalizeRepoUrl } from "@/lib/repo";
import {
  parseMembers,
  passwordSchema,
  repoUrlSchema,
} from "@/lib/validation";

function redirectTo(path: string, key: "ok" | "error", message: string): never {
  const separator = path.includes("?") ? "&" : "?";
  redirect(`${path}${separator}${key}=${encodeURIComponent(message)}`);
}

function refresh() {
  revalidatePath("/", "layout");
}

async function uniqueInviteCode(excludeId?: number): Promise<string> {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const code = generateInviteCode();
    const existing = await db
      .select({ id: groups.id })
      .from(groups)
      .where(eq(groups.inviteCode, code))
      .get();
    if (!existing || existing.id === excludeId) {
      return code;
    }
  }
  throw new Error("Impossible de générer un code d'invitation unique.");
}

export async function initializeGroups(formData: FormData) {
  await requireAdmin();
  const current = await getSettings();
  if (current.phase !== "SETUP") {
    redirectTo(
      "/admin/groupes",
      "error",
      "La configuration des groupes n'est possible qu'en phase de préparation.",
    );
  }

  const total = Number.parseInt(String(formData.get("numGroups") ?? ""), 10);
  if (
    !Number.isInteger(total) ||
    total < MIN_GROUPS ||
    total > MAX_GROUPS
  ) {
    redirectTo(
      "/admin/groupes",
      "error",
      `Choisissez un nombre de groupes entre ${MIN_GROUPS} et ${MAX_GROUPS}.`,
    );
  }

  const existing = await db.select({ value: count() }).from(groups).get();
  if (Number(existing?.value ?? 0) > 0) {
    redirectTo(
      "/admin/groupes",
      "error",
      "Des groupes existent déjà. Utilisez la réinitialisation complète pour repartir de zéro.",
    );
  }

  const codes = new Set<string>();
  const now = new Date();
  const rows: { slotLabel: string; inviteCode: string; createdAt: Date }[] = [];
  while (rows.length < total) {
    const code = generateInviteCode();
    if (codes.has(code)) continue;
    codes.add(code);
    rows.push({
      slotLabel: `Groupe ${rows.length + 1}`,
      inviteCode: code,
      createdAt: now,
    });
  }

  db.transaction((tx) => {
    for (const row of rows) {
      tx.insert(groups).values(row).run();
    }
    tx.update(settings)
      .set({ numGroups: total, updatedAt: now })
      .where(eq(settings.id, 1))
      .run();
  });

  await logAudit({
    actorType: "admin",
    action: "admin.groups.initialize",
    details: { total },
  });

  refresh();
  redirectTo("/admin/groupes", "ok", `${total} groupes créés avec leurs codes.`);
}

export async function resetEverything(formData: FormData) {
  await requireAdmin();
  const confirmation = String(formData.get("confirm") ?? "")
    .trim()
    .toUpperCase();
  if (confirmation !== "REINITIALISER") {
    redirectTo(
      "/admin/groupes",
      "error",
      "Saisissez REINITIALISER pour confirmer l'effacement complet.",
    );
  }

  const now = new Date();
  db.transaction((tx) => {
    tx.delete(reviews).run();
    tx.delete(assignments).run();
    tx.delete(groups).run();
    tx.delete(auditLog).run();
    tx.update(settings)
      .set({
        phase: "SETUP",
        drawSeed: null,
        drawAt: null,
        reviewsClosedAt: null,
        resultsPublishedAt: null,
        updatedAt: now,
      })
      .where(eq(settings.id, 1))
      .run();
  });

  await logAudit({ actorType: "admin", action: "admin.reset" });
  refresh();
  redirectTo("/admin/dashboard", "ok", "Toutes les données ont été effacées.");
}

export async function openInscriptions() {
  await requireAdmin();
  const current = await getSettings();
  if (current.phase !== "SETUP") {
    redirectTo("/admin/dashboard", "error", "Les inscriptions sont déjà gérées.");
  }
  const groupsCount = await db.select({ value: count() }).from(groups).get();
  if (Number(groupsCount?.value ?? 0) < MIN_GROUPS) {
    redirectTo(
      "/admin/dashboard",
      "error",
      "Créez d'abord les groupes avant d'ouvrir les inscriptions.",
    );
  }

  await db
    .update(settings)
    .set({ phase: "INSCRIPTIONS", updatedAt: new Date() })
    .where(eq(settings.id, 1));
  await logAudit({ actorType: "admin", action: "admin.phase.open_inscriptions" });
  refresh();
  redirectTo("/admin/dashboard", "ok", "Les inscriptions sont ouvertes.");
}

export async function closeInscriptions() {
  await requireAdmin();
  const current = await getSettings();
  if (current.phase !== "INSCRIPTIONS") {
    redirectTo("/admin/dashboard", "error", "Les inscriptions ne sont pas ouvertes.");
  }
  await db
    .update(settings)
    .set({ phase: "SETUP", updatedAt: new Date() })
    .where(eq(settings.id, 1));
  await logAudit({ actorType: "admin", action: "admin.phase.close_inscriptions" });
  refresh();
  redirectTo("/admin/dashboard", "ok", "Les inscriptions sont fermées.");
}

async function performDraw() {
  const current = await getSettings();
  const allGroups = await getGroups();
  if (allGroups.length < MIN_GROUPS) {
    redirectTo(
      "/admin/tirage",
      "error",
      `Il faut au moins ${MIN_GROUPS} groupes pour lancer la roulette.`,
    );
  }

  const registered = allGroups.filter((group) => group.status === "registered");
  if (registered.length !== allGroups.length) {
    redirectTo(
      "/admin/tirage",
      "error",
      `Tous les groupes doivent être inscrits (${registered.length}/${allGroups.length}).`,
    );
  }

  const edges = generateDraw(registered.map((group) => group.id));
  const seed = generateDrawSeed();
  const now = new Date();

  db.transaction((tx) => {
    tx.delete(reviews).run();
    tx.delete(assignments).run();
    for (const edge of edges) {
      tx.insert(assignments)
        .values({
          reviewerGroupId: edge.reviewerGroupId,
          reviewedGroupId: edge.reviewedGroupId,
          createdAt: now,
        })
        .run();
    }
    tx.update(settings)
      .set({
        phase: "DRAW",
        drawSeed: seed,
        drawAt: now,
        reviewsClosedAt: null,
        resultsPublishedAt: null,
        updatedAt: now,
      })
      .where(eq(settings.id, 1))
      .run();
  });

  await logAudit({
    actorType: "admin",
    action: current.phase === "DRAW" ? "admin.draw.redraw" : "admin.draw.launch",
    details: { seed, edges: edges.length },
  });

  refresh();
  redirectTo(
    "/admin/tirage",
    "ok",
    current.phase === "DRAW" ? "Nouveau tirage effectué." : "Tirage effectué.",
  );
}

export async function launchDraw() {
  await requireAdmin();
  const current = await getSettings();
  if (current.phase !== "INSCRIPTIONS" && current.phase !== "SETUP") {
    redirectTo(
      "/admin/tirage",
      "error",
      "Le tirage a déjà été lancé. Utilisez « Re-tirer » si nécessaire.",
    );
  }
  await performDraw();
}

export async function redraw() {
  await requireAdmin();
  const current = await getSettings();
  if (current.phase !== "DRAW") {
    redirectTo(
      "/admin/tirage",
      "error",
      "Le re-tirage n'est possible qu'avant l'ouverture des reviews.",
    );
  }
  await performDraw();
}

export async function openReviews() {
  await requireAdmin();
  const current = await getSettings();
  if (current.phase !== "DRAW") {
    redirectTo("/admin/dashboard", "error", "Le tirage doit être effectué d'abord.");
  }
  await db
    .update(settings)
    .set({ phase: "REVIEWS", updatedAt: new Date() })
    .where(eq(settings.id, 1));
  await logAudit({ actorType: "admin", action: "admin.phase.open_reviews" });
  refresh();
  redirectTo("/admin/dashboard", "ok", "La phase de reviews est ouverte.");
}

export async function closeReviews() {
  await requireAdmin();
  const current = await getSettings();
  if (current.phase !== "REVIEWS") {
    redirectTo("/admin/dashboard", "error", "La phase de reviews n'est pas ouverte.");
  }
  const now = new Date();
  await db
    .update(settings)
    .set({
      phase: "CLOSED",
      reviewsClosedAt: now,
      resultsPublishedAt: now,
      updatedAt: now,
    })
    .where(eq(settings.id, 1));
  await logAudit({ actorType: "admin", action: "admin.phase.close_reviews" });
  refresh();
  redirectTo("/admin/dashboard", "ok", "Les reviews sont closes et les résultats publiés.");
}

export async function reopenReviews() {
  await requireAdmin();
  const current = await getSettings();
  if (current.phase !== "CLOSED") {
    redirectTo("/admin/dashboard", "error", "Les reviews ne sont pas closes.");
  }
  await db
    .update(settings)
    .set({ phase: "REVIEWS", resultsPublishedAt: null, updatedAt: new Date() })
    .where(eq(settings.id, 1));
  await logAudit({ actorType: "admin", action: "admin.phase.reopen_reviews" });
  refresh();
  redirectTo("/admin/dashboard", "ok", "La phase de reviews est réouverte.");
}

export async function resetGroupPassword(formData: FormData) {
  await requireAdmin();
  const groupId = Number(formData.get("groupId"));
  const parsed = passwordSchema.safeParse(String(formData.get("password") ?? ""));
  if (!parsed.success) {
    redirectTo(
      "/admin/groupes",
      "error",
      parsed.error.issues[0]?.message ?? "Mot de passe invalide.",
    );
  }
  const group = await getGroupById(groupId);
  if (!group) {
    redirectTo("/admin/groupes", "error", "Groupe introuvable.");
  }
  await db
    .update(groups)
    .set({ passwordHash: bcrypt.hashSync(parsed.data, 10) })
    .where(eq(groups.id, groupId));
  await logAudit({
    actorType: "admin",
    action: "admin.group.password_reset",
    details: { groupId },
  });
  refresh();
  redirectTo("/admin/groupes", "ok", "Mot de passe réinitialisé.");
}

export async function regenerateInviteCode(formData: FormData) {
  await requireAdmin();
  const groupId = Number(formData.get("groupId"));
  const group = await getGroupById(groupId);
  if (!group) {
    redirectTo("/admin/groupes", "error", "Groupe introuvable.");
  }
  const code = await uniqueInviteCode(groupId);
  await db.update(groups).set({ inviteCode: code }).where(eq(groups.id, groupId));
  await logAudit({
    actorType: "admin",
    action: "admin.group.code_regenerate",
    details: { groupId, code },
  });
  refresh();
  redirectTo("/admin/groupes", "ok", `Nouveau code : ${code}`);
}

export async function adminUpdateGroup(formData: FormData) {
  await requireAdmin();
  const current = await getSettings();
  if (
    current.phase !== "SETUP" &&
    current.phase !== "INSCRIPTIONS" &&
    current.phase !== "DRAW"
  ) {
    redirectTo(
      "/admin/groupes",
      "error",
      "Les dépôts ne peuvent plus être modifiés après l'ouverture des reviews.",
    );
  }

  const groupId = Number(formData.get("groupId"));
  const group = await getGroupById(groupId);
  if (!group) {
    redirectTo("/admin/groupes", "error", "Groupe introuvable.");
  }

  const displayName = String(formData.get("displayName") ?? "").trim();
  const members = String(formData.get("members") ?? "");
  const rawRepo = String(formData.get("repoUrl") ?? "").trim();

  let repoUrl: string | null = group.repoUrl;
  if (rawRepo) {
    const parsed = repoUrlSchema.safeParse(rawRepo);
    if (!parsed.success) {
      redirectTo("/admin/groupes", "error", "Lien GitHub invalide.");
    }
    repoUrl = normalizeRepoUrl(parsed.data);
  }

  await db
    .update(groups)
    .set({
      displayName: displayName || group.displayName,
      members: parseMembers(members),
      repoUrl,
    })
    .where(eq(groups.id, groupId));

  await logAudit({
    actorType: "admin",
    action: "admin.group.update",
    details: { groupId, displayName, repoUrl },
  });
  refresh();
  redirectTo("/admin/groupes", "ok", "Groupe mis à jour.");
}

export async function resetRegistration(formData: FormData) {
  await requireAdmin();
  const current = await getSettings();
  if (current.phase !== "SETUP" && current.phase !== "INSCRIPTIONS") {
    redirectTo(
      "/admin/groupes",
      "error",
      "L'inscription ne peut être réinitialisée qu'avant le tirage.",
    );
  }
  const groupId = Number(formData.get("groupId"));
  const group = await getGroupById(groupId);
  if (!group) {
    redirectTo("/admin/groupes", "error", "Groupe introuvable.");
  }

  db.transaction((tx) => {
    tx.delete(assignments)
      .where(
        or(
          eq(assignments.reviewerGroupId, groupId),
          eq(assignments.reviewedGroupId, groupId),
        ),
      )
      .run();
    tx.update(groups)
      .set({
        displayName: null,
        members: [],
        repoUrl: null,
        passwordHash: null,
        status: "pending",
        registeredAt: null,
      })
      .where(eq(groups.id, groupId))
      .run();
  });

  await logAudit({
    actorType: "admin",
    action: "admin.group.registration_reset",
    details: { groupId },
  });
  refresh();
  redirectTo("/admin/groupes", "ok", "Inscription réinitialisée.");
}

export async function reopenReview(formData: FormData) {
  await requireAdmin();
  const reviewId = Number(formData.get("reviewId"));
  const review = await db
    .select()
    .from(reviews)
    .where(eq(reviews.id, reviewId))
    .get();
  if (!review) {
    redirectTo("/admin/reviews", "error", "Review introuvable.");
  }
  await db
    .update(reviews)
    .set({ status: "draft", submittedAt: null, updatedAt: new Date() })
    .where(eq(reviews.id, reviewId));
  await logAudit({
    actorType: "admin",
    action: "admin.review.reopen",
    details: { reviewId },
  });
  refresh();
  redirectTo("/admin/reviews", "ok", "Review réouverte pour modification.");
}
