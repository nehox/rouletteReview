import { redirect } from "next/navigation";
import { getSession } from "./session";

export async function requireAdmin() {
  const session = await getSession();
  if (session.role !== "admin") {
    redirect("/admin?error=Connexion%20administrateur%20requise.");
  }
  return session;
}

export async function requireGroup() {
  const session = await getSession();
  if (session.role !== "group" || !session.groupId) {
    redirect("/?error=Connexion%20requise.");
  }
  return session as typeof session & { role: "group"; groupId: number };
}

export async function getOptionalSession() {
  return getSession();
}
