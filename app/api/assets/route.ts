import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || '';
  const type = searchParams.get('type') || '';
  const condition = searchParams.get('condition') || '';

  const conditions: string[] = [];
  const params: unknown[] = [];
  let p = 1;

  if (search) {
    conditions.push(`(a.asset_tag ILIKE $${p} OR a.make ILIKE $${p} OR a.model ILIKE $${p} OR a.serial_no ILIKE $${p})`);
    params.push(`%${search}%`); p++;
  }
  if (type) { conditions.push(`a.asset_type = $${p++}`); params.push(type); }
  if (condition) { conditions.push(`a.condition = $${p++}`); params.push(condition); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const assets = await query(`
    SELECT
      a.*,
      CASE WHEN aa.id IS NOT NULL THEN COALESCE(s.name, assoc.name) END AS assigned_to_name,
      CASE WHEN aa.id IS NOT NULL THEN
        CASE WHEN aa.staff_id IS NOT NULL THEN 'staff' ELSE 'association' END
      END AS assigned_to_type,
      aa.assigned_date AS current_assigned_date
    FROM assets a
    LEFT JOIN LATERAL (
      SELECT * FROM asset_assignments
      WHERE asset_id = a.id AND returned_date IS NULL
      ORDER BY created_at DESC LIMIT 1
    ) aa ON TRUE
    LEFT JOIN staff s ON aa.staff_id = s.id
    LEFT JOIN associations assoc ON aa.association_id = assoc.id
    ${where}
    ORDER BY a.created_at DESC
  `, params);

  return NextResponse.json(assets);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as { role?: string }).role === 'viewer') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { asset_type, asset_tag, make, model, serial_no, fru_part_no, condition, purchase_date, warranty_expiry, notes } = body;

  if (!asset_type) return NextResponse.json({ error: 'Asset type is required' }, { status: 400 });

  const asset = await queryOne(`
    INSERT INTO assets (asset_type, asset_tag, make, model, serial_no, fru_part_no, condition, purchase_date, warranty_expiry, notes)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *
  `, [
    asset_type,
    asset_tag?.trim() || null,
    make?.trim() || null,
    model?.trim() || null,
    serial_no?.trim() || null,
    fru_part_no?.trim() || null,
    condition || 'good',
    purchase_date || null,
    warranty_expiry || null,
    notes?.trim() || null,
  ]);

  return NextResponse.json(asset, { status: 201 });
}
