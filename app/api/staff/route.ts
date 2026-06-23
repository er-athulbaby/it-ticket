import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const staff = await query(`
    SELECT * FROM staff ORDER BY name ASC
  `);

  return NextResponse.json(staff);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, department } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

  const member = await queryOne(
    'INSERT INTO staff (name, department) VALUES ($1, $2) RETURNING *',
    [name.trim(), department?.trim() || null]
  );

  return NextResponse.json(member, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, name, department, is_active } = await req.json();
  const member = await queryOne(
    'UPDATE staff SET name=$1, department=$2, is_active=$3 WHERE id=$4 RETURNING *',
    [name, department || null, is_active, id]
  );

  return NextResponse.json(member);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await req.json();
  await query('DELETE FROM staff WHERE id=$1', [id]);
  return NextResponse.json({ success: true });
}
