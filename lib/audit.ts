import { query } from './db';

type Action = 'create' | 'update' | 'delete';

export async function logAudit(params: {
  entityType: string;
  entityId: number | null;
  entityLabel?: string | null;
  action: Action;
  changes?: Record<string, { old: unknown; new: unknown }> | null;
  adminId: number | null;
  adminName?: string | null;
}) {
  const { entityType, entityId, entityLabel, action, changes, adminId, adminName } = params;
  try {
    await query(
      `INSERT INTO audit_log (entity_type, entity_id, entity_label, action, changes, admin_id, admin_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [entityType, entityId, entityLabel || null, action, changes && Object.keys(changes).length ? JSON.stringify(changes) : null, adminId, adminName || null]
    );
  } catch {
    // Never let audit logging break the actual operation
  }
}

// Compares `before` (existing row) against `patch` (only the fields being changed)
// and returns just the fields whose value actually changed.
export function diffFields(
  before: Record<string, unknown>,
  patch: Record<string, unknown>
): Record<string, { old: unknown; new: unknown }> {
  const changes: Record<string, { old: unknown; new: unknown }> = {};
  for (const key of Object.keys(patch)) {
    const oldVal = before[key] ?? null;
    const newVal = patch[key] ?? null;
    if (String(oldVal) !== String(newVal)) changes[key] = { old: oldVal, new: newVal };
  }
  return changes;
}

export function adminIdFromSession(session: unknown): number | null {
  const rawSid = (session as { user?: { id?: string } })?.user?.id ?? '';
  return rawSid ? parseInt(rawSid.replace('admin_', '')) || null : null;
}

export function adminNameFromSession(session: unknown): string | null {
  return (session as { user?: { name?: string } })?.user?.name ?? null;
}
