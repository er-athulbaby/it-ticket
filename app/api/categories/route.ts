import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';

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

  const cat = await queryOne(
    'INSERT INTO categories (name, description, color) VALUES ($1, $2, $3) RETURNING *',
    [name.trim(), description || null, color || '#6366f1']
  );

  return NextResponse.json(cat, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, name, description, color } = await req.json();
  const cat = await queryOne(
    'UPDATE categories SET name=$1, description=$2, color=$3 WHERE id=$4 RETURNING *',
    [name, description, color, id]
  );

  return NextResponse.json(cat);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await req.json();
  await query('DELETE FROM categories WHERE id = $1', [id]);
  return NextResponse.json({ success: true });
}
