import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const asset = await queryOne(`
    SELECT
      a.*,
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

  return NextResponse.json({ ...asset, history });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as { role?: string }).role === 'viewer') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const body = await req.json();

  const setClauses: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  const set = (col: string, val: unknown) => { setClauses.push(`${col} = $${idx++}`); values.push(val ?? null); };

  if ('asset_type' in body) set('asset_type', body.asset_type);
  if ('asset_tag' in body) set('asset_tag', body.asset_tag?.trim() || null);
  if ('make' in body) set('make', body.make?.trim() || null);
  if ('model' in body) set('model', body.model?.trim() || null);
  if ('serial_no' in body) set('serial_no', body.serial_no?.trim() || null);
  if ('fru_part_no' in body) set('fru_part_no', body.fru_part_no?.trim() || null);
  if ('condition' in body) set('condition', body.condition);
  if ('purchase_date' in body) set('purchase_date', body.purchase_date || null);
  if ('warranty_expiry' in body) set('warranty_expiry', body.warranty_expiry || null);
  if ('notes' in body) set('notes', body.notes?.trim() || null);
  if ('category_id' in body) set('category_id', body.category_id ? Number(body.category_id) : null);

  if (!setClauses.length) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });

  setClauses.push(`updated_at = NOW()`);
  values.push(id);

  const asset = await queryOne(
    `UPDATE assets SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );

  return NextResponse.json(asset);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as { role?: string }).role === 'viewer') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  await query('DELETE FROM assets WHERE id = $1', [id]);
  return NextResponse.json({ ok: true });
}
