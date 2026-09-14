import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { logAudit } from '@/lib/audit';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as { role?: string }).role === 'viewer') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const { transaction_type, quantity, ticket_id, staff_id, department, notes } = await req.json();

  if (!['in', 'out'].includes(transaction_type)) return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  if (!quantity || quantity <= 0) return NextResponse.json({ error: 'Quantity must be > 0' }, { status: 400 });

  const rawSid = (session?.user as { id?: string })?.id ?? '';
  const adminId = rawSid ? parseInt(rawSid.replace('admin_', '')) : null;

  // For stock out, check sufficient quantity
  if (transaction_type === 'out') {
    const [{ qty }] = await query<{ qty: number }>(
      `SELECT quantity AS qty FROM consumables WHERE id=$1`, [id]
    );
    if (qty < quantity) return NextResponse.json({ error: `Only ${qty} in stock` }, { status: 400 });
  }

  const delta = transaction_type === 'in' ? quantity : -quantity;
  await query(`UPDATE consumables SET quantity = quantity + $1, updated_at = NOW() WHERE id = $2`, [delta, id]);

  const tx = await queryOne<{ id: number }>(
    `INSERT INTO consumable_transactions (consumable_id, transaction_type, quantity, ticket_id, staff_id, department, notes, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [id, transaction_type, quantity, ticket_id || null, staff_id || null, department?.trim() || null, notes?.trim() || null, adminId]
  );

  const consumable = await queryOne<{ name: string }>('SELECT name FROM consumables WHERE id=$1', [id]);
  logAudit({
    entityType: 'consumable_transaction', entityId: tx?.id ?? null,
    entityLabel: `${transaction_type === 'in' ? 'Stock in' : 'Stock out'} ${quantity} x ${consumable?.name || 'item'}`,
    action: 'create', adminId, adminName: (session.user as { name?: string })?.name || null,
  });

  return NextResponse.json(tx, { status: 201 });
}
