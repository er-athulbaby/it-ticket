import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { query, queryOne } from '@/lib/db';
import bcrypt from 'bcryptjs';

async function requireAdmin(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  return token?.userType === 'admin';
}

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const staff = await query(`SELECT id, name, department, email, photo_filename, is_active, created_at FROM staff ORDER BY name ASC`);
  return NextResponse.json(staff);
}

export async function POST(req: NextRequest) {
  if (!await requireAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, department, email, password } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  if (email && !password) return NextResponse.json({ error: 'Password required when email is provided' }, { status: 400 });

  const hashed = email && password ? await bcrypt.hash(password, 10) : null;

  const member = await queryOne(
    'INSERT INTO staff (name, department, email, password) VALUES ($1, $2, $3, $4) RETURNING id, name, department, email, photo_filename, is_active, created_at',
    [name.trim(), department?.trim() || null, email?.trim() || null, hashed]
  );

  return NextResponse.json(member, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  if (!await requireAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, name, department, is_active, email, password } = await req.json();

  let hashedPass: string | null | undefined;
  if (!email) {
    hashedPass = null;
  } else if (password) {
    hashedPass = await bcrypt.hash(password, 10);
  }

  const member = await queryOne(
    `UPDATE staff SET name=$1, department=$2, is_active=$3, email=$4 ${hashedPass !== undefined ? ', password=$6' : ''} WHERE id=$5 RETURNING id, name, department, email, photo_filename, is_active, created_at`,
    hashedPass !== undefined
      ? [name, department || null, is_active, email || null, id, hashedPass]
      : [name, department || null, is_active, email || null, id]
  );

  return NextResponse.json(member);
}

export async function DELETE(req: NextRequest) {
  if (!await requireAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await req.json();
  await query('DELETE FROM staff WHERE id=$1', [id]);
  return NextResponse.json({ success: true });
}
