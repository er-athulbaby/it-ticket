import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { logAudit, diffFields, adminIdFromSession, adminNameFromSession } from '@/lib/audit';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const asset = await queryOne(`
    SELECT
      a.*,
      ac.name AS category_name, ac.color AS category_color,
      CASE WHEN aa.id IS NOT NULL THEN COALESCE(s.name, assoc.name) END AS assigned_to_name,
      CASE WHEN aa.id IS NOT NULL THEN
        CASE WHEN aa.staff_id IS NOT NULL THEN 'staff' ELSE 'association' END
      END AS assigned_to_type,
      aa.id AS current_assignment_id,
      aa.staff_id AS current_staff_id,
      aa.association_id AS current_association_id,
      aa.assigned_date AS current_assigned_date,
      aa.notes AS current_assignment_notes
    FROM assets a
    LEFT JOIN asset_categories ac ON a.category_id = ac.id
    LEFT JOIN LATERAL (
      SELECT * FROM asset_assignments
      WHERE asset_id = a.id AND returned_date IS NULL
      ORDER BY created_at DESC LIMIT 1
    ) aa ON TRUE
    LEFT JOIN staff s ON aa.staff_id = s.id
    LEFT JOIN associations assoc ON aa.association_id = assoc.id
    WHERE a.id = $1
  `, [id]);

  if (!asset) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const history = await query(`
    SELECT
      aa.*,
      COALESCE(s.name, assoc.name) AS holder_name,
      CASE WHEN aa.staff_id IS NOT NULL THEN 'staff' ELSE 'association' END AS holder_type,
      adm.name AS assigned_by_name
    FROM asset_assignments aa
    LEFT JOIN staff s ON aa.staff_id = s.id
    LEFT JOIN associations assoc ON aa.association_id = assoc.id
    LEFT JOIN admins adm ON aa.assigned_by = adm.id
    WHERE aa.asset_id = $1
    ORDER BY aa.created_at DESC
  `, [id]);

  const auditHistory = await query(`
    SELECT id, action, changes, admin_name, created_at FROM audit_log
    WHERE entity_type = 'asset' AND entity_id = $1
    ORDER BY created_at DESC
  `, [id]);

  return NextResponse.json({ ...asset, history, auditHistory });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as { role?: string }).role === 'viewer') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const body = await req.json();

  const before = await queryOne<Record<string, unknown>>('SELECT * FROM assets WHERE id = $1', [id]);
  if (!before) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const setClauses: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  const set = (col: string, val: unknown) => { setClauses.push(`${col} = $${idx++}`); values.push(val ?? null); };
  const patch: Record<string, unknown> = {};

  if ('asset_tag' in body) { const v = body.asset_tag?.trim() || null; set('asset_tag', v); patch.asset_tag = v; }
  if ('make' in body) { const v = body.make?.trim() || null; set('make', v); patch.make = v; }
  if ('vendor' in body) { const v = body.vendor?.trim() || null; set('vendor', v); patch.vendor = v; }
  if ('model' in body) { const v = body.model?.trim() || null; set('model', v); patch.model = v; }
  if ('serial_no' in body) { const v = body.serial_no?.trim() || null; set('serial_no', v); patch.serial_no = v; }
  if ('fru_part_no' in body) { const v = body.fru_part_no?.trim() || null; set('fru_part_no', v); patch.fru_part_no = v; }
  if ('condition' in body) { set('condition', body.condition); patch.condition = body.condition; }
  if ('purchase_date' in body) { set('purchase_date', body.purchase_date || null); patch.purchase_date = body.purchase_date || null; }
  if ('warranty_expiry' in body) { set('warranty_expiry', body.warranty_expiry || null); patch.warranty_expiry = body.warranty_expiry || null; }
  if ('unit_price' in body) { set('unit_price', body.unit_price || null); patch.unit_price = body.unit_price || null; }
  if ('notes' in body) { const v = body.notes?.trim() || null; set('notes', v); patch.notes = v; }
  if ('category_id' in body && body.category_id) { set('category_id', Number(body.category_id)); patch.category_id = Number(body.category_id); }

  if (!setClauses.length) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });

  setClauses.push(`updated_at = NOW()`);
  values.push(id);

  const asset = await queryOne<{ id: number; asset_tag: string | null }>(
    `UPDATE assets SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );

  const changes = diffFields(before, patch);
  if (Object.keys(changes).length) {
    logAudit({
      entityType: 'asset', entityId: Number(id), entityLabel: asset?.asset_tag || `Asset #${id}`,
      action: 'update', changes, adminId: adminIdFromSession(session), adminName: adminNameFromSession(session),
    });
  }

  return NextResponse.json(asset);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as { role?: string }).role === 'viewer') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const existing = await queryOne<{ asset_tag: string | null }>('SELECT asset_tag FROM assets WHERE id = $1', [id]);
  await query('DELETE FROM assets WHERE id = $1', [id]);

  logAudit({
    entityType: 'asset', entityId: Number(id), entityLabel: existing?.asset_tag || `Asset #${id}`,
    action: 'delete', adminId: adminIdFromSession(session), adminName: adminNameFromSession(session),
  });

  return NextResponse.json({ ok: true });
}
