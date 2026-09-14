import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { logAudit, adminIdFromSession, adminNameFromSession } from '@/lib/audit';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || '';
  const condition = searchParams.get('condition') || '';
  const category = searchParams.get('category') || '';

  const conditions: string[] = [];
  const params: unknown[] = [];
  let p = 1;

  if (search) {
    conditions.push(`(a.asset_tag ILIKE $${p} OR a.make ILIKE $${p} OR a.model ILIKE $${p} OR a.serial_no ILIKE $${p} OR a.vendor ILIKE $${p})`);
    params.push(`%${search}%`); p++;
  }
  if (condition) { conditions.push(`a.condition = $${p++}`); params.push(condition); }
  if (category) { conditions.push(`a.category_id = $${p++}`); params.push(Number(category)); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const assets = await query(`
    SELECT
      a.*,
      ac.name AS category_name, ac.color AS category_color,
      CASE WHEN aa.id IS NOT NULL THEN COALESCE(s.name, assoc.name) END AS assigned_to_name,
      CASE WHEN aa.id IS NOT NULL THEN
        CASE WHEN aa.staff_id IS NOT NULL THEN 'staff' ELSE 'association' END
      END AS assigned_to_type,
      aa.assigned_date AS current_assigned_date
    FROM assets a
    LEFT JOIN asset_categories ac ON a.category_id = ac.id
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
  const { asset_tag, make, vendor, model, serial_no, fru_part_no, condition, purchase_date, warranty_expiry, unit_price, notes, category_id } = body;

  if (!category_id) return NextResponse.json({ error: 'Category is required' }, { status: 400 });

  const asset = await queryOne<{ id: number; asset_tag: string | null }>(`
    INSERT INTO assets (category_id, asset_tag, make, vendor, model, serial_no, fru_part_no, condition, purchase_date, warranty_expiry, unit_price, notes)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *
  `, [
    Number(category_id),
    asset_tag?.trim() || null,
    make?.trim() || null,
    vendor?.trim() || null,
    model?.trim() || null,
    serial_no?.trim() || null,
    fru_part_no?.trim() || null,
    condition || 'good',
    purchase_date || null,
    warranty_expiry || null,
    unit_price || null,
    notes?.trim() || null,
  ]);

  if (asset) {
    logAudit({
      entityType: 'asset', entityId: asset.id, entityLabel: asset.asset_tag || `Asset #${asset.id}`,
      action: 'create', adminId: adminIdFromSession(session), adminName: adminNameFromSession(session),
    });
  }

  return NextResponse.json(asset, { status: 201 });
}
