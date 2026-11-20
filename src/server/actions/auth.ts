"use server";

import { and, eq, ne } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { timingSafeEqual } from "node:crypto";
import { redirect } from "next/navigation";
import { db, groups } from "@/db";
import { logAudit } from "@/lib/audit";
import { getSettings } from "@/lib/data";
import {
  isRateLimited,
  registerFailure,
  resetFailures,
  retryAfterSeconds,
} from "@/lib/rate-limit";
import { normalizeRepoUrl } from "@/lib/repo";
import { getSession } from "@/lib/session";
import {
  parseMembers,
  registrationSchema,
  repoUrlSchema,
} from "@/lib/validation";
import { requireGroup } from "@/lib/auth";

function safeEqual(first: string, second: string): boolean {
  const a = Buffer.from(first);
  const b = Buffer.from(second);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function redirectWith(path: string, key: string, message: string): never {
  const separator = path.includes("?") ? "&" : "?";
  redirect(`${path}${separator}${key}=${encodeURIComponent(message)}`);
}

export async function adminLogin(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const expected = process.env.ADMIN_PASSWORD ?? "";
  const rateKey = "admin";

  if (isRateLimited(rateKey)) {
    redirectWith(
      "/admin",
      "error",
      `Trop de tentatives. Réessayez dans ${retryAfterSeconds(rateKey)} secondes.`,
    );
  }

  if (!expected) {
    redirectWith(
      "/admin",
      "error",
      "ADMIN_PASSWORD n'est pas configuré sur le serveur.",
    );
  }

  if (!safeEqual(password, expected)) {
    registerFailure(rateKey);
    redirectWith("/admin", "error", "Mot de passe administrateur incorrect.");
  }

  resetFailures(rateKey);
  const session = await getSession();
  session.role = "admin";
  session.groupId = undefined;
  session.groupCode = undefined;
  await session.save();
  await logAudit({ actorType: "admin", action: "admin.login" });
  redirect("/admin/dashboard");
}

export async function groupLogin(formData: FormData) {
  const code = String(formData.get("code") ?? "")
    .trim()
    .toUpperCase();
  const password = String(formData.get("password") ?? "");
  const rateKey = `group:${code || "unknown"}`;

  if (isRateLimited(rateKey)) {
    redirectWith(
      "/",
      "error",
      `Trop de tentatives. Réessayez dans ${retryAfterSeconds(rateKey)} secondes.`,
    );
  }

  const group = await db
    .select()
    .from(groups)
    .where(eq(groups.inviteCode, code))
    .get();

  if (
    !group ||
    !group.passwordHash ||
    !bcrypt.compareSync(password, group.passwordHash)
  ) {
    registerFailure(rateKey);
    redirectWith("/", "error", "Code de groupe ou mot de passe incorrect.");
  }

  resetFailures(rateKey);
  const session = await getSession();
  session.role = "group";
  session.groupId = group.id;
  session.groupCode = group.inviteCode;
  await session.save();
  await logAudit({
    actorType: "group",
    actorId: group.id,
    action: "group.login",
  });
  redirect("/espace");
}

export async function adminLogout() {
  const session = await getSession();
  await session.destroy();
  redirect("/admin");
}

export async function groupLogout() {
  const session = await getSession();
  await session.destroy();
  redirect("/");
}

export async function registerGroup(formData: FormData) {
  const raw = {
    code: String(formData.get("code") ?? ""),
    displayName: String(formData.get("displayName") ?? ""),
    members: String(formData.get("members") ?? ""),
    repoUrl: String(formData.get("repoUrl") ?? ""),
    password: String(formData.get("password") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  };

  const code = raw.code.trim().toUpperCase();
  const parsed = registrationSchema.safeParse(raw);
  if (!parsed.success) {
    redirectWith(
      `/inscription?code=${encodeURIComponent(code)}`,
      "error",
      parsed.error.issues[0]?.message ?? "Formulaire invalide.",
    );
  }

  const settings = await getSettings();
  if (settings.phase !== "INSCRIPTIONS") {
    redirectWith(
      `/inscription?code=${encodeURIComponent(code)}`,
      "error",
      "Les inscriptions ne sont pas ouvertes pour le moment.",
    );
  }

  const group = await db
    .select()
    .from(groups)
    .where(eq(groups.inviteCode, code))
    .get();

  if (!group) {
    redirectWith(
      `/inscription?code=${encodeURIComponent(code)}`,
      "error",
      "Ce code de groupe est inconnu.",
    );
  }

  if (group.status === "registered") {
    redirectWith(
      `/inscription?code=${encodeURIComponent(code)}`,
      "error",
      "Ce groupe est déjà inscrit. Connectez-vous depuis l'accueil.",
    );
  }

  const repoUrl = normalizeRepoUrl(parsed.data.repoUrl);
  if (!repoUrl) {
    redirectWith(
      `/inscription?code=${encodeURIComponent(code)}`,
      "error",
      "Lien GitHub invalide.",
    );
  }

  const duplicate = await db
    .select({ id: groups.id })
    .from(groups)
    .where(and(eq(groups.repoUrl, repoUrl), ne(groups.id, group.id)))
    .get();

  if (duplicate) {
    redirectWith(
      `/inscription?code=${encodeURIComponent(code)}`,
      "error",
      "Ce dépôt GitHub est déjà utilisé par un autre groupe.",
    );
  }

  const passwordHash = bcrypt.hashSync(parsed.data.password, 10);
  await db
    .update(groups)
    .set({
      displayName: parsed.data.displayName,
      members: parseMembers(parsed.data.members ?? ""),
      repoUrl,
      passwordHash,
      status: "registered",
      registeredAt: new Date(),
    })
    .where(eq(groups.id, group.id));

  await logAudit({
    actorType: "group",
    actorId: group.id,
    action: "group.register",
    details: { displayName: parsed.data.displayName, repoUrl },
  });

  const session = await getSession();
  session.role = "group";
  session.groupId = group.id;
  session.groupCode = group.inviteCode;
  await session.save();

  redirect("/espace?ok=Inscription%20enregistr%C3%A9e.");
}

export async function updateRepo(formData: FormData) {
  const session = await requireGroup();
  const settings = await getSettings();
  if (settings.phase !== "INSCRIPTIONS") {
    redirectWith(
      "/espace",
      "error",
      "Le dépôt est verrouillé : les inscriptions sont fermées.",
    );
  }

  const parsed = repoUrlSchema.safeParse(String(formData.get("repoUrl") ?? ""));
  if (!parsed.success) {
    redirectWith("/espace", "error", "Lien GitHub invalide.");
  }

  const repoUrl = normalizeRepoUrl(parsed.data);
  if (!repoUrl) {
    redirectWith("/espace", "error", "Lien GitHub invalide.");
  }

  const duplicate = await db
    .select({ id: groups.id })
    .from(groups)
    .where(and(eq(groups.repoUrl, repoUrl), ne(groups.id, session.groupId)))
    .get();

  if (duplicate) {
    redirectWith(
      "/espace",
      "error",
      "Ce dépôt GitHub est déjà utilisé par un autre groupe.",
    );
  }

  await db
    .update(groups)
    .set({ repoUrl })
    .where(eq(groups.id, session.groupId));

  await logAudit({
    actorType: "group",
    actorId: session.groupId,
    action: "group.repo.update",
    details: { repoUrl },
  });

  redirect("/espace?ok=D%C3%A9p%C3%B4t%20mis%20%C3%A0%20jour.");
}
