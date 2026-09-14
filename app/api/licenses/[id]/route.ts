import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { logAudit, diffFields, adminIdFromSession, adminNameFromSession } from '@/lib/audit';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const license = await queryOne('SELECT * FROM licenses WHERE id = $1', [id]);
  if (!license) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const assignments = await query(`
    SELECT la.*, s.name AS staff_name, a.name AS association_name, adm.name AS assigned_by_name
    FROM license_assignments la
    LEFT JOIN staff s ON la.staff_id = s.id
    LEFT JOIN associations a ON la.association_id = a.id
    LEFT JOIN admins adm ON la.assigned_by = adm.id
    WHERE la.license_id = $1
    ORDER BY la.returned_date IS NULL DESC, la.created_at DESC
  `, [id]);

  const auditHistory = await query(`
    SELECT id, action, changes, admin_name, created_at FROM audit_log
    WHERE entity_type = 'license' AND entity_id = $1
    ORDER BY created_at DESC
  `, [id]);

  return NextResponse.json({ ...license, assignments, auditHistory });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as { role?: string }).role === 'viewer') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  const body = await req.json();

  const before = await queryOne<Record<string, unknown>>('SELECT * FROM licenses WHERE id = $1', [id]);
  if (!before) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const set: string[] = []; const vals: unknown[] = []; let i = 1;
  const s = (col: string, v: unknown) => { set.push(`${col}=$${i++}`); vals.push(v ?? null); };
  const patch: Record<string, unknown> = {};

  if ('name' in body) { s('name', body.name?.trim()); patch.name = body.name?.trim(); }
  if ('vendor' in body) { const v = body.vendor?.trim() || null; s('vendor', v); patch.vendor = v; }
  if ('software_type' in body) { const v = body.software_type?.trim() || null; s('software_type', v); patch.software_type = v; }
  if ('license_key' in body) { const v = body.license_key?.trim() || null; s('license_key', v); patch.license_key = v; }
  if ('seats' in body) { s('seats', body.seats); patch.seats = body.seats; }
  if ('purchase_date' in body) { s('purchase_date', body.purchase_date || null); patch.purchase_date = body.purchase_date || null; }
  if ('expiry_date' in body) { s('expiry_date', body.expiry_date || null); patch.expiry_date = body.expiry_date || null; }
  if ('remind_90' in body) { s('remind_90', !!body.remind_90); patch.remind_90 = !!body.remind_90; }
  if ('remind_60' in body) { s('remind_60', !!body.remind_60); patch.remind_60 = !!body.remind_60; }
  if ('remind_30' in body) { s('remind_30', !!body.remind_30); patch.remind_30 = !!body.remind_30; }
  if ('notes' in body) { const v = body.notes?.trim() || null; s('notes', v); patch.notes = v; }
  if (!set.length) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  set.push(`updated_at=NOW()`); vals.push(id);
  const row = await queryOne<{ id: number; name: string }>(`UPDATE licenses SET ${set.join(',')} WHERE id=$${i} RETURNING *`, vals);

  const changes = diffFields(before, patch);
  if (Object.keys(changes).length) {
    logAudit({
      entityType: 'license', entityId: Number(id), entityLabel: row?.name || `License #${id}`,
      action: 'update', changes, adminId: adminIdFromSession(session), adminName: adminNameFromSession(session),
    });
  }

  return NextResponse.json(row);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as { role?: string }).role === 'viewer') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  const existing = await queryOne<{ name: string }>('SELECT name FROM licenses WHERE id=$1', [id]);
  await query('DELETE FROM licenses WHERE id=$1', [id]);

  logAudit({
    entityType: 'license', entityId: Number(id), entityLabel: existing?.name || `License #${id}`,
    action: 'delete', adminId: adminIdFromSession(session), adminName: adminNameFromSession(session),
  });

  return NextResponse.json({ ok: true });
}
