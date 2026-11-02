import { db } from "@/lib/db";
import { getClientIp } from "@/lib/request";
import type { CurrentSession } from "@/lib/auth/session";

type AuditInput = {
  actor: CurrentSession | null;
  action: string;
  entityType: string;
  entityId?: string | number | null;
  details?: Record<string, unknown>;
};

/** Records an important change. Never throws: auditing must not break the operation itself. */
export async function audit({ actor, action, entityType, entityId, details }: AuditInput): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        actorId: actor?.user.id ?? null,
        actorEmail: actor?.user.email ?? null,
        action,
        entityType,
        entityId: entityId == null ? null : String(entityId),
        details: details ? JSON.stringify(details) : null,
        ipAddress: await getClientIp().catch(() => null),
      },
    });
  } catch (err) {
    console.error("[audit] failed to write audit log", err);
  }
}
