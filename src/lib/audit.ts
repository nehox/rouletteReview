import { db, auditLog } from "@/db";

export async function logAudit(entry: {
  actorType: "admin" | "group" | "system";
  actorId?: number | null;
  action: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  await db.insert(auditLog).values({
    actorType: entry.actorType,
    actorId: entry.actorId ?? null,
    action: entry.action,
    details: entry.details ?? {},
    createdAt: new Date(),
  });
}
