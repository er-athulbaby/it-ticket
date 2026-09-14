import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { logAudit, adminIdFromSession, adminNameFromSession } from '@/lib/audit';

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await query(`
    SELECT c.*,
      COALESCE(SUM(CASE WHEN t.transaction_type = 'in' THEN t.quantity ELSE 0 END), 0)::int AS total_in,
      COALESCE(SUM(CASE WHEN t.transaction_type = 'out' THEN t.quantity ELSE 0 END), 0)::int AS total_out
    FROM consumables c
    LEFT JOIN consumable_transactions t ON t.consumable_id = c.id
    GROUP BY c.id
    ORDER BY c.name ASC
  `);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as { role?: string }).role === 'viewer') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { name, category, unit, quantity, low_stock_threshold, notes } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });

  const row = await queryOne<{ id: number; name: string }>(
    `INSERT INTO consumables (name, category, unit, quantity, low_stock_threshold, notes)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [name.trim(), category?.trim() || null, unit || 'piece', quantity ?? 0, low_stock_threshold ?? 5, notes?.trim() || null]
  );

  if (row) {
    logAudit({ entityType: 'consumable', entityId: row.id, entityLabel: row.name, action: 'create', adminId: adminIdFromSession(session), adminName: adminNameFromSession(session) });
  }

  return NextResponse.json(row, { status: 201 });
}
