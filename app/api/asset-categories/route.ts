import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { logAudit, adminIdFromSession, adminNameFromSession } from '@/lib/audit';

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const cats = await query('SELECT * FROM asset_categories ORDER BY name ASC');
  return NextResponse.json(cats);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as { role?: string }).role === 'viewer') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { name, color } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });

  const cat = await queryOne<{ id: number; name: string }>(
    `INSERT INTO asset_categories (name, color) VALUES ($1, $2) RETURNING *`,
    [name.trim(), color || '#6366f1']
  );

  if (cat) {
    logAudit({ entityType: 'asset_category', entityId: cat.id, entityLabel: cat.name, action: 'create', adminId: adminIdFromSession(session), adminName: adminNameFromSession(session) });
  }

  return NextResponse.json(cat, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as { role?: string }).role === 'viewer') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await req.json();
  const existing = await queryOne<{ name: string }>('SELECT name FROM asset_categories WHERE id = $1', [id]);
  await query('DELETE FROM asset_categories WHERE id = $1', [id]);

  logAudit({ entityType: 'asset_category', entityId: id, entityLabel: existing?.name || `Category #${id}`, action: 'delete', adminId: adminIdFromSession(session), adminName: adminNameFromSession(session) });

  return NextResponse.json({ ok: true });
}
