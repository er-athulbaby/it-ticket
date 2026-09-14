import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { logAudit, diffFields, adminIdFromSession, adminNameFromSession } from '@/lib/audit';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const row = await queryOne(`SELECT * FROM consumables WHERE id = $1`, [id]);
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const transactions = await query(`
    SELECT t.*, a.name AS admin_name, tk.ticket_number, s.name AS staff_name
    FROM consumable_transactions t
    LEFT JOIN admins a ON t.created_by = a.id
    LEFT JOIN tickets tk ON t.ticket_id = tk.id
    LEFT JOIN staff s ON t.staff_id = s.id
    WHERE t.consumable_id = $1
    ORDER BY t.created_at DESC
  `, [id]);

  const auditHistory = await query(`
    SELECT id, action, changes, admin_name, created_at FROM audit_log
    WHERE entity_type = 'consumable' AND entity_id = $1
    ORDER BY created_at DESC
  `, [id]);

  return NextResponse.json({ ...row, transactions, auditHistory });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as { role?: string }).role === 'viewer') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  const body = await req.json();

  const before = await queryOne<Record<string, unknown>>('SELECT * FROM consumables WHERE id=$1', [id]);
  if (!before) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const set: string[] = []; const vals: unknown[] = []; let i = 1;
  const s = (col: string, v: unknown) => { set.push(`${col}=$${i++}`); vals.push(v ?? null); };
  const patch: Record<string, unknown> = {};
  if ('name' in body) { s('name', body.name?.trim()); patch.name = body.name?.trim(); }
  if ('category' in body) { const v = body.category?.trim() || null; s('category', v); patch.category = v; }
  if ('unit' in body) { s('unit', body.unit); patch.unit = body.unit; }
  if ('low_stock_threshold' in body) { s('low_stock_threshold', body.low_stock_threshold); patch.low_stock_threshold = body.low_stock_threshold; }
  if ('notes' in body) { const v = body.notes?.trim() || null; s('notes', v); patch.notes = v; }
  if (!set.length) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  set.push(`updated_at=NOW()`); vals.push(id);
  const row = await queryOne<{ id: number; name: string }>(`UPDATE consumables SET ${set.join(',')} WHERE id=$${i} RETURNING *`, vals);

  const changes = diffFields(before, patch);
  if (Object.keys(changes).length) {
    logAudit({ entityType: 'consumable', entityId: Number(id), entityLabel: row?.name || `Consumable #${id}`, action: 'update', changes, adminId: adminIdFromSession(session), adminName: adminNameFromSession(session) });
  }

  return NextResponse.json(row);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as { role?: string }).role === 'viewer') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  const existing = await queryOne<{ name: string }>('SELECT name FROM consumables WHERE id=$1', [id]);
  await query('DELETE FROM consumables WHERE id=$1', [id]);

  logAudit({ entityType: 'consumable', entityId: Number(id), entityLabel: existing?.name || `Consumable #${id}`, action: 'delete', adminId: adminIdFromSession(session), adminName: adminNameFromSession(session) });

  return NextResponse.json({ ok: true });
}
