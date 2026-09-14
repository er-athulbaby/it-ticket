import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { logAudit, diffFields, adminIdFromSession, adminNameFromSession } from '@/lib/audit';

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const categories = await query(`
    SELECT c.*, COUNT(t.id)::int AS ticket_count
    FROM categories c
    LEFT JOIN tickets t ON t.category_id = c.id
    GROUP BY c.id
    ORDER BY c.name ASC
  `);

  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, description, color } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

  const cat = await queryOne<{ id: number; name: string }>(
    'INSERT INTO categories (name, description, color) VALUES ($1, $2, $3) RETURNING *',
    [name.trim(), description || null, color || '#6366f1']
  );

  if (cat) {
    logAudit({ entityType: 'category', entityId: cat.id, entityLabel: cat.name, action: 'create', adminId: adminIdFromSession(session), adminName: adminNameFromSession(session) });
  }

  return NextResponse.json(cat, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, name, description, color } = await req.json();

  const before = await queryOne<Record<string, unknown>>('SELECT * FROM categories WHERE id=$1', [id]);
  if (!before) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const cat = await queryOne<{ id: number; name: string }>(
    'UPDATE categories SET name=$1, description=$2, color=$3 WHERE id=$4 RETURNING *',
    [name, description, color, id]
  );

  const changes = diffFields(before, { name, description, color });
  if (Object.keys(changes).length) {
    logAudit({ entityType: 'category', entityId: Number(id), entityLabel: cat?.name || `Category #${id}`, action: 'update', changes, adminId: adminIdFromSession(session), adminName: adminNameFromSession(session) });
  }

  return NextResponse.json(cat);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await req.json();
  const existing = await queryOne<{ name: string }>('SELECT name FROM categories WHERE id = $1', [id]);
  await query('DELETE FROM categories WHERE id = $1', [id]);

  logAudit({ entityType: 'category', entityId: id, entityLabel: existing?.name || `Category #${id}`, action: 'delete', adminId: adminIdFromSession(session), adminName: adminNameFromSession(session) });

  return NextResponse.json({ success: true });
}
