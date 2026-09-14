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

  const staff = await query(`
    SELECT s.id, s.name, s.department, s.email, s.mobile, s.staff_code, s.ms_license,
           s.association_id, a.name AS association_name,
           s.photo_filename, s.is_active, s.created_at
    FROM staff s
    LEFT JOIN associations a ON s.association_id = a.id
    ORDER BY s.name ASC
  `);
  return NextResponse.json(staff);
}

export async function POST(req: NextRequest) {
  if (!await requireAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, department, email, password, mobile, association_id, ms_license } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  if (email && !password) return NextResponse.json({ error: 'Password required when email is provided' }, { status: 400 });

  const hashed = email && password ? await bcrypt.hash(password, 10) : null;

  const member = await queryOne(
    `INSERT INTO staff (name, department, email, password, mobile, association_id, ms_license)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, name, department, email, mobile, association_id, ms_license, staff_code, photo_filename, is_active, created_at`,
    [name.trim(), department?.trim() || null, email?.trim() || null, hashed, mobile?.trim() || null, association_id || null, ms_license?.trim() || null]
  );

  return NextResponse.json(member, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  if (!await requireAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, name, department, is_active, email, password, mobile, association_id, ms_license } = await req.json();

  let hashedPass: string | null | undefined;
  if (!email) {
    hashedPass = null;
  } else if (password) {
    hashedPass = await bcrypt.hash(password, 10);
  }

  const member = await queryOne(
    `UPDATE staff SET name=$1, department=$2, is_active=$3, email=$4, mobile=$5, association_id=$6, ms_license=$7
     ${hashedPass !== undefined ? ', password=$9' : ''} WHERE id=$8
     RETURNING id, name, department, email, mobile, association_id, ms_license, staff_code, photo_filename, is_active, created_at`,
    hashedPass !== undefined
      ? [name, department || null, is_active, email || null, mobile || null, association_id || null, ms_license || null, id, hashedPass]
      : [name, department || null, is_active, email || null, mobile || null, association_id || null, ms_license || null, id]
  );

  return NextResponse.json(member);
}

export async function DELETE(req: NextRequest) {
  if (!await requireAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await req.json();
  await query('DELETE FROM staff WHERE id=$1', [id]);
  return NextResponse.json({ success: true });
}
